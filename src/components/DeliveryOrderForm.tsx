import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User,
  Phone,
  MapPin,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Package,
  ReceiptText,
  Search,
  ClipboardList,
} from "lucide-react";
import {
  normalizeCurrency,
  formatMoney,
  computeOrderTotals,
  presentTotals,
  validateDeliveryOrderForm,
  buildDeliveryOrderMessage,
} from "@/lib/order-totals";

// ÚNICO número de contacto permitido en todo el formulario (Mel). Nunca usar otro.
const WHATSAPP_NUMBER = "5363180910";

interface CatalogProduct {
  id: string;
  name: string;
  unitPrice: number;
  currency: "USD" | "CUP";
  stock: number | null; // null = sin control de stock
}

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  currency: "USD" | "CUP";
  quantity: number;
  maxStock: number | null;
}

interface DeliveryOrderFormProps {
  distanceKm: number;
  pricePerKm: number;
  originLabel: string;
  dest: { lat: number; lng: number } | null;
  stop: { lat: number; lng: number } | null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive font-medium">{message}</p>;
}

export function DeliveryOrderForm({
  distanceKm,
  pricePerKm,
  originLabel,
  dest,
  stop,
}: DeliveryOrderFormProps) {
  // Datos del cliente
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  // Dirección escrita
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [betweenStreets, setBetweenStreets] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [reference, setReference] = useState("");
  // Productos
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  // Errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Catálogo en vivo (misma convención que la tienda: tabla products, activos)
  useEffect(() => {
    const load = async () => {
      setLoadingProducts(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,price,currency,price_cup,stock")
          .eq("is_active", true)
          .order("name");
        if (error) throw error;
        const list: CatalogProduct[] = (data ?? []).map((p: any) => {
          const currency = normalizeCurrency(p.currency);
          const unitPrice =
            currency === "CUP"
              ? Number(p.price_cup ?? p.price) || 0
              : Number(p.price) || 0;
          return {
            id: String(p.id),
            name: String(p.name ?? ""),
            unitPrice,
            currency,
            stock: p.stock == null ? null : Number(p.stock),
          };
        });
        setProducts(list);
      } catch {
        toast.error("No se pudo cargar el catálogo de productos.");
      } finally {
        setLoadingProducts(false);
      }
    };
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const totals = useMemo(
    () =>
      computeOrderTotals(
        cart.map((c) => ({
          name: c.name,
          unitPrice: c.unitPrice,
          currency: c.currency,
          quantity: c.quantity,
        })),
        distanceKm,
        pricePerKm,
      ),
    [cart, distanceKm, pricePerKm],
  );
  const presentation = useMemo(() => presentTotals(totals), [totals]);

  const getQty = (id: string) => pendingQty[id] ?? 1;
  const setQty = (id: string, qty: number) =>
    setPendingQty((prev) => ({ ...prev, [id]: Math.max(1, qty) }));

  const addToCart = (p: CatalogProduct) => {
    if (p.stock === 0) {
      toast.error("Ese producto está agotado.");
      return;
    }
    const qty = getQty(p.id);
    const cappedQty =
      p.stock != null ? Math.min(qty, p.stock) : qty;
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id);
      if (existing) {
        const newQty =
          p.stock != null
            ? Math.min(existing.quantity + cappedQty, p.stock)
            : existing.quantity + cappedQty;
        return prev.map((c) =>
          c.productId === p.id ? { ...c, quantity: newQty } : c,
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unitPrice: p.unitPrice,
          currency: p.currency,
          quantity: cappedQty,
          maxStock: p.stock,
        },
      ];
    });
    if (p.stock != null && qty > p.stock) {
      toast.info(`Solo quedan ${p.stock} en stock; se ajustó la cantidad.`);
    } else {
      toast.success(`${p.name} agregado al pedido.`);
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.items;
      return next;
    });
  };

  const changeCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.productId !== productId) return c;
          const next = c.quantity + delta;
          if (c.maxStock != null && next > c.maxStock) {
            toast.info(`Solo hay ${c.maxStock} disponibles.`);
            return c;
          }
          return { ...c, quantity: next };
        })
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.productId !== productId));

  const handleConfirm = () => {
    if (!dest) {
      toast.error("Primero marca tu destino en el mapa.");
      return;
    }
    const { ok, errors: errs } = validateDeliveryOrderForm(
      {
        customerName,
        customerPhone,
        altPhone,
        street,
        houseNumber,
        betweenStreets,
        municipality,
        reference,
      },
      cart.length,
    );
    setErrors(errs);
    if (!ok) {
      const first = Object.values(errs)[0];
      toast.error(first ?? "Revisa los datos del pedido.");
      return;
    }
    const message = buildDeliveryOrderMessage({
      customerName,
      customerPhone,
      altPhone,
      street,
      houseNumber,
      betweenStreets,
      municipality,
      reference,
      destLat: dest.lat,
      destLng: dest.lng,
      stopLat: stop?.lat ?? null,
      stopLng: stop?.lng ?? null,
      originLabel,
      items: cart.map((c) => ({
        name: c.name,
        unitPrice: c.unitPrice,
        currency: c.currency,
        quantity: c.quantity,
      })),
      deliveryKm: distanceKm,
      pricePerKm,
    });
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
          <ClipboardList className="w-7 h-7 text-primary" /> Completa tu pedido
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ya tienes tu destino y el costo del envío. Ahora tus datos, tu dirección
          escrita y los productos que quieres.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Datos del cliente */}
        <Card className="p-6 rounded-3xl shadow-soft border-border/50 bg-white/80 backdrop-blur-sm">
          <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-primary" /> Tus datos
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Nombre completo *
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="rounded-xl"
              />
              <FieldError message={errors.customerName} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Tu teléfono *
              </Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ej: 5xxxxxxx"
                inputMode="tel"
                className="rounded-xl"
              />
              <FieldError message={errors.customerPhone} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Otro teléfono (opcional)
              </Label>
              <Input
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                placeholder="Por si no hay cobertura en el tuyo"
                inputMode="tel"
                className="rounded-xl"
              />
              <FieldError message={errors.altPhone} />
            </div>
          </div>
        </Card>

        {/* Dirección escrita */}
        <Card className="p-6 rounded-3xl shadow-soft border-border/50 bg-white/80 backdrop-blur-sm">
          <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-5">
            <MapPin className="w-5 h-5 text-primary" /> Dirección escrita
          </h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Escríbela completa para que el mensajero no se pierda. El punto del mapa
            ya quedó marcado; esto es el complemento.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Calle *
                </Label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ej: Calle D"
                  className="rounded-xl"
                />
                <FieldError message={errors.street} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  No. *
                </Label>
                <Input
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="509"
                  className="rounded-xl"
                />
                <FieldError message={errors.houseNumber} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Entre calles
              </Label>
              <Input
                value={betweenStreets}
                onChange={(e) => setBetweenStreets(e.target.value)}
                placeholder="Ej: 21 y 23"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Municipio
              </Label>
              <Input
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="Ej: Plaza de la Revolución"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Referencia / punto de referencia
              </Label>
              <Textarea
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: casa de dos plantas, reja negra, al lado de la bodega…"
                className="rounded-xl min-h-[70px]"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Productos */}
      <Card className="p-6 rounded-3xl shadow-soft border-border/50 bg-white/80 backdrop-blur-sm">
        <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-1">
          <Package className="w-5 h-5 text-primary" /> Elige tus productos
        </h3>
        <p className="text-[11px] text-muted-foreground mb-5">
          Precios en vivo de la tienda. No se pueden agregar productos agotados.
        </p>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar producto…"
              className="rounded-xl pl-9"
            />
          </div>
        </div>

        {loadingProducts ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Cargando catálogo…
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {products.length === 0
              ? "No hay productos disponibles ahora mismo."
              : "Sin resultados para esa búsqueda."}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredProducts.map((p) => {
              const out = p.stock === 0;
              const qty = getQty(p.id);
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border flex items-center gap-3 ${
                    out
                      ? "opacity-50 bg-secondary/20 border-border/50"
                      : "bg-secondary/30 border-border/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(p.unitPrice, p.currency)}
                      {p.stock != null && p.stock > 0 && (
                        <span> · {p.stock} disp.</span>
                      )}
                    </p>
                    {out && (
                      <Badge variant="destructive" className="mt-1 text-[10px]">
                        Agotado
                      </Badge>
                    )}
                  </div>
                  {!out && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-7 h-7 rounded-lg"
                        onClick={() => setQty(p.id, qty - 1)}
                        aria-label="Quitar uno"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-7 h-7 rounded-lg"
                        onClick={() =>
                          setQty(
                            p.id,
                            p.stock != null ? Math.min(qty + 1, p.stock) : qty + 1,
                          )
                        }
                        aria-label="Agregar uno"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-lg ml-1"
                        onClick={() => addToCart(p)}
                      >
                        Agregar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Carrito del pedido */}
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4" /> Tu pedido ({cart.length})
          </h4>
          {cart.length === 0 ? (
            <div>
              <p className="text-sm text-muted-foreground text-center border-2 border-dashed border-border rounded-2xl py-6">
                Todavía no agregaste productos.
              </p>
              <FieldError message={errors.items} />
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((c) => (
                <div
                  key={c.productId}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.quantity} × {formatMoney(c.unitPrice, c.currency)} ={" "}
                      <strong className="text-foreground">
                        {formatMoney(c.quantity * c.unitPrice, c.currency)}
                      </strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 rounded-lg"
                      onClick={() => changeCartQty(c.productId, -1)}
                      aria-label="Quitar uno"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">
                      {c.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 rounded-lg"
                      onClick={() => changeCartQty(c.productId, 1)}
                      aria-label="Agregar uno"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 rounded-lg"
                      onClick={() => removeFromCart(c.productId)}
                      aria-label="Eliminar del pedido"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Totales */}
      <Card className="p-6 rounded-3xl shadow-soft bg-primary text-white overflow-hidden relative">
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <ReceiptText className="w-32 h-32" />
        </div>
        <div className="relative z-10 space-y-3">
          <h3 className="font-display text-lg font-bold">Resumen del pedido</h3>

          {totals.lines.length === 0 ? (
            <p className="text-sm opacity-80">
              Agrega productos para ver el total.
            </p>
          ) : (
            <div className="space-y-1.5 text-sm">
              {totals.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="opacity-90 truncate">
                    {l.quantity} × {l.name}
                  </span>
                  <span className="font-semibold shrink-0">
                    {formatMoney(l.lineTotal, l.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/20 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="opacity-80">💰 Productos</span>
              <span className="font-bold text-right">{presentation.productsLine}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="opacity-80">🚚 Mensajería</span>
              <span className="font-bold text-right">{presentation.deliveryLine}</span>
            </div>
            <div className="flex justify-between gap-3 text-base pt-1">
              <span className="font-bold">💵 Total</span>
              <span className="font-display font-bold text-right">
                {presentation.totalLine}
              </span>
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            className="w-full bg-white text-primary font-bold rounded-xl py-6 text-base hover:bg-white/90 transition-colors"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> Confirmar pedido por WhatsApp
          </Button>
          <p className="text-[11px] opacity-70 text-center">
            Se abrirá WhatsApp con tu pedido listo para enviar al +53 63180910.
          </p>
        </div>
      </Card>
    </div>
  );
}

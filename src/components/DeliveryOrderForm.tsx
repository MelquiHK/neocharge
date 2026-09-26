import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Check,
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
  return (
    <p role="alert" className="text-xs text-destructive font-medium">
      {message}
    </p>
  );
}

// Indicador visual de pasos. Solo presentación: se deriva del estado que ya
// existe en el formulario, no cambia ninguna lógica ni validación.
function OrderSteps({
  steps,
}: {
  steps: { label: string; short: string; done: boolean }[];
}) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <nav
      aria-label="Progreso del pedido"
      className="rounded-2xl border border-border/50 bg-white/70 backdrop-blur px-3 py-2.5 sm:px-4 shadow-soft"
    >
      <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto max-w-full min-w-0">
        {steps.map((s, i) => {
          const done = s.done;
          const isCurrent = i === current;
          return (
            <li
              key={s.label}
              className="flex items-center gap-1 sm:gap-2 shrink-0"
              aria-current={isCurrent ? "step" : undefined}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`h-px w-3 sm:w-6 rounded ${
                    done || isCurrent || current === -1
                      ? "bg-primary/40"
                      : "bg-border"
                  }`}
                />
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] sm:text-xs font-bold border whitespace-nowrap transition-colors ${
                  done
                    ? "bg-primary/10 text-primary border-primary/25"
                    : isCurrent
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                      : "bg-secondary/60 text-muted-foreground border-border/60"
                }`}
              >
                {done ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
                <span className="sm:hidden">{s.short}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
    </div>
  );
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
        const list: CatalogProduct[] = (data ?? []).map((p: { id: unknown; name: unknown; price: unknown; currency: unknown; price_cup: unknown; stock: unknown }) => {
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

  // Pasos del indicador visual (derivado del estado; no afecta la validación)
  const steps = [
    { label: "Destino", short: "Destino", done: true },
    {
      label: "Tus datos",
      short: "Datos",
      done: customerName.trim() !== "" && customerPhone.trim() !== "",
    },
    {
      label: "Dirección",
      short: "Dirección",
      done: street.trim() !== "" && houseNumber.trim() !== "",
    },
    { label: "Productos", short: "Productos", done: cart.length > 0 },
    { label: "Confirmar", short: "Confirmar", done: false },
  ];

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
    <div className="space-y-5 sm:space-y-6 mt-8 min-w-0 max-w-full">
      <div className="text-center max-w-2xl mx-auto min-w-0 max-w-full">
        <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
          <ClipboardList className="w-7 h-7 text-primary" /> Completa tu pedido
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Ya tienes tu destino y el costo del envío. Ahora tus datos, tu dirección
          escrita y los productos que quieres.
        </p>
      </div>

      <OrderSteps steps={steps} />

      <div className="grid gap-5 sm:gap-6 xl:grid-cols-3 items-start">
        <div className="xl:col-span-2 space-y-5 sm:space-y-6 min-w-0">
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
            {/* Datos del cliente */}
            <Card className="p-5 sm:p-6 rounded-3xl shadow-soft border-border/50 bg-white/80 backdrop-blur-sm">
              <SectionHeader
                icon={<User className="w-5 h-5" />}
                title="Tus datos"
              />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dof-name"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Nombre completo *
                  </Label>
                  <Input className="cr-input"
                    id="dof-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    autoComplete="name"
                    className="rounded-xl h-11"
                  />
                  <FieldError message={errors.customerName} />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dof-phone"
                    className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" /> Tu teléfono *
                  </Label>
                  <Input className="cr-input"
                    id="dof-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ej: 5xxxxxxx"
                    inputMode="tel"
                    autoComplete="tel"
                    className="rounded-xl h-11"
                  />
                  <FieldError message={errors.customerPhone} />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dof-altphone"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Otro teléfono (opcional)
                  </Label>
                  <Input className="cr-input"
                    id="dof-altphone"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="Por si no hay cobertura en el tuyo"
                    inputMode="tel"
                    autoComplete="tel"
                    className="rounded-xl h-11"
                  />
                  <FieldError message={errors.altPhone} />
                </div>
              </div>
            </Card>

            {/* Dirección escrita */}
            <Card className="p-5 sm:p-6 rounded-3xl shadow-soft border-border/50 bg-white/80 backdrop-blur-sm">
              <SectionHeader
                icon={<MapPin className="w-5 h-5" />}
                title="Dirección escrita"
              />
              <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                Escríbela completa para que el mensajero no se pierda. El punto del mapa
                ya quedó marcado; esto es el complemento.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="dof-street"
                      className="text-xs font-bold uppercase text-muted-foreground"
                    >
                      Calle *
                    </Label>
                    <Input className="cr-input"
                      id="dof-street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ej: Calle D"
                      autoComplete="street-address"
                      className="rounded-xl h-11"
                    />
                    <FieldError message={errors.street} />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="dof-number"
                      className="text-xs font-bold uppercase text-muted-foreground"
                    >
                      No. *
                    </Label>
                    <Input className="cr-input"
                      id="dof-number"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      placeholder="509"
                      inputMode="numeric"
                      className="rounded-xl h-11"
                    />
                    <FieldError message={errors.houseNumber} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dof-between"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Entre calles
                  </Label>
                  <Input className="cr-input"
                    id="dof-between"
                    value={betweenStreets}
                    onChange={(e) => setBetweenStreets(e.target.value)}
                    placeholder="Ej: 21 y 23"
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dof-muni"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Municipio
                  </Label>
                  <Input className="cr-input"
                    id="dof-muni"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="Ej: Plaza de la Revolución"
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dof-ref"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Referencia / punto de referencia
                  </Label>
                  <Textarea
                    id="dof-ref"
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
          <Card className="p-5 sm:p-6 rounded-3xl shadow-soft border-border/50 bg-white/80 backdrop-blur-sm">
            <SectionHeader
              icon={<Package className="w-5 h-5" />}
              title="Elige tus productos"
            />
            <p className="text-[11px] text-muted-foreground mb-5 -mt-3 leading-relaxed">
              Precios en vivo de la tienda. No se pueden agregar productos agotados.
            </p>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input className="cr-input"
                  id="dof-search"
                  aria-label="Buscar producto"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto…"
                  className="rounded-xl pl-9 h-11"
                />
              </div>
            </div>

            {loadingProducts ? (
              <div>
                <p role="status" className="sr-only">
                  Cargando catálogo…
                </p>
                <div
                  aria-hidden="true"
                  className="grid sm:grid-cols-2 gap-2"
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl border border-border/50 bg-secondary/20"
                    >
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-2" />
                    </div>
                  ))}
                </div>
              </div>
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
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
                        out
                          ? "opacity-50 bg-secondary/20 border-border/50"
                          : "bg-secondary/30 border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
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
                            className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl"
                            onClick={() => setQty(p.id, qty - 1)}
                            aria-label="Quitar uno"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="w-6 text-center text-sm font-bold tabular-nums">
                            {qty}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl"
                            onClick={() =>
                              setQty(
                                p.id,
                                p.stock != null ? Math.min(qty + 1, p.stock) : qty + 1,
                              )
                            }
                            aria-label="Agregar uno"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            className="rounded-xl ml-1 h-11 sm:h-9 px-4"
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
                <ShoppingCart className="w-4 h-4" /> Tu pedido
                <span
                  key={cart.length}
                  className="animate-cart-pop inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums"
                >
                  {cart.length}
                </span>
              </h4>
              {cart.length === 0 ? (
                <div>
                  <div className="text-center border-2 border-dashed border-border rounded-2xl px-4 py-8">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Todavía no agregaste productos.
                    </p>
                  </div>
                  <div className="mt-2">
                    <FieldError message={errors.items} />
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cart.map((c) => (
                    <li
                      key={c.productId}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
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
                          className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl"
                          onClick={() => changeCartQty(c.productId, -1)}
                          aria-label="Quitar uno"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">
                          {c.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl"
                          onClick={() => changeCartQty(c.productId, 1)}
                          aria-label="Agregar uno"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl"
                          onClick={() => removeFromCart(c.productId)}
                          aria-label="Eliminar del pedido"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Resumen del pedido (fijo al hacer scroll en escritorio) */}
        <div className="xl:col-span-1 min-w-0">
          <div className="xl:sticky xl:top-24">
            <Card className="overflow-hidden rounded-3xl border-0 bg-primary text-white shadow-xl shadow-primary/25">
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -right-8 -top-8 opacity-10 pointer-events-none"
                >
                  <ReceiptText className="w-44 h-44" />
                </div>
                <div className="relative p-5 sm:p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-2xl bg-white/15 shrink-0">
                      <ReceiptText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold leading-tight">
                        Resumen del pedido
                      </h3>
                      <p className="text-[11px] opacity-70 tabular-nums">
                        {distanceKm.toFixed(1)} km desde {originLabel}
                      </p>
                    </div>
                  </div>

                  {totals.lines.length === 0 ? (
                    <p className="text-sm opacity-80 rounded-2xl border border-dashed border-white/25 px-4 py-5 text-center">
                      Agrega productos para ver el total.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {totals.lines.map((l, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span className="opacity-90 truncate">
                            {l.quantity} × {l.name}
                          </span>
                          <span className="font-semibold tabular-nums shrink-0">
                            {formatMoney(l.lineTotal, l.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Separator className="bg-white/15 my-4" />

                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="opacity-80">💰 Productos</dt>
                      <dd className="font-bold tabular-nums text-right">
                        {presentation.productsLine}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="opacity-80">🚚 Mensajería</dt>
                      <dd className="font-bold tabular-nums text-right">
                        {presentation.deliveryLine}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-2xl bg-white/10 border border-white/20 px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                        💵 Total
                      </span>
                      <span className="font-display text-lg sm:text-xl font-bold tabular-nums text-right leading-snug">
                        {presentation.totalLine}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleConfirm}
                    className="w-full mt-5 min-h-[56px] bg-white text-primary font-bold rounded-2xl text-base hover:bg-white/90 active:scale-[0.99] transition shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" /> Confirmar pedido por
                    WhatsApp
                  </Button>
                  <p className="text-[11px] opacity-70 text-center mt-3">
                    Se abrirá WhatsApp con tu pedido listo para enviar al +53 63180910.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

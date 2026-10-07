import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildSaleDetails } from "@/lib/sales";
import { formatCUP, formatMoney } from "@/lib/format";
import {
  effectiveOwnStock,
  normalizePartnerCurrency,
  partnerMarginUsd as calcPartnerMarginUsd,
  toUsd,
} from "@/lib/partner-sales";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Handshake, Home, MapPin, Truck, User } from "lucide-react";

interface RegistrarVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  price_cup?: number | null;
  own_stock: number;
  stock: number;
}

interface PartnerSource {
  partner_id: string;
  partner_name: string;
  partner_price: number;
  partner_currency: string;
  location_id: string;
  location_name: string;
  location_address: string;
  attendant_name: string | null;
  quantity: number;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  priority: number;
}

type SaleSource =
  | { type: "own" }
  | { type: "partner"; source: PartnerSource };

const BASE_COMMISSION_CUP = 2000;

export function RegistrarVentaDialog({ open, onOpenChange, onSaved }: RegistrarVentaDialogProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [productId, setProductId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [currency, setCurrency] = useState<"USD" | "CUP">("USD");
  const [deliveryType, setDeliveryType] = useState<"recogida" | "mensajeria">("recogida");
  const [notes, setNotes] = useState("");

  // Fuentes de surtido del producto elegido
  const [loadingSources, setLoadingSources] = useState(false);
  const [ownQty, setOwnQty] = useState(0);
  const [partnerSources, setPartnerSources] = useState<PartnerSource[]>([]);
  const [source, setSource] = useState<SaleSource | null>(null);

  const { rate } = useExchangeRate();
  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  const resetForm = () => {
    setProductId("");
    setCustomerName("");
    setCustomerPhone("");
    setFinalPrice("");
    setCurrency("USD");
    setDeliveryType("recogida");
    setNotes("");
    setOwnQty(0);
    setPartnerSources([]);
    setSource(null);
  };

  // Carga productos la primera vez que se abre (y resetea el formulario).
  useEffect(() => {
    if (!open) return;
    resetForm();
    if (products.length > 0) return;
    const load = async () => {
      setLoadingProducts(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, currency, price_cup, own_stock, stock")
          .eq("is_active", true)
          .order("name");
        if (error) throw error;
        setProducts(
          (data ?? []).map((p) => ({
            id: String(p.id),
            name: String(p.name ?? ""),
            price: Number(p.price ?? 0),
            currency: String(p.currency ?? "USD"),
            price_cup: p.price_cup != null ? Number(p.price_cup) : null,
            own_stock: Number((p as { own_stock?: number }).own_stock ?? 0),
            stock: Number(p.stock ?? 0),
          })),
        );
      } catch (error: unknown) {
        toast.error("No se pudieron cargar los productos: " + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoadingProducts(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  // Carga las fuentes de surtido (propio + socios) del producto elegido.
  // Usa la función controlada get_partner_sale_sources: no expone teléfonos,
  // notas internas ni costos más allá de lo necesario para el margen.
  const loadSources = async (id: string, own: number, legacyStock: number) => {
    setLoadingSources(true);
    setOwnQty(0);
    setPartnerSources([]);
    setSource(null);
    try {
      let rows: {
        partner_id: string; partner_name: string; partner_price: number; partner_currency: string;
        location_id: string; location_name: string; location_address: string;
        attendant_name: string | null; quantity: number;
        pickup_enabled: boolean; delivery_enabled: boolean; priority: number;
      }[] = [];
      try {
        const { data, error } = await supabase.rpc("get_partner_sale_sources", { p_product_id: id });
        if (error) throw error;
        rows = (data ?? []) as typeof rows;
      } catch (rpcError: unknown) {
        const msg = rpcError instanceof Error ? rpcError.message : String(rpcError);
        // Si la función no existe (migración pendiente), se sigue solo con lo propio.
        if (!/does not exist|Could not find/i.test(msg)) throw rpcError;
        rows = [];
      }

      const configured = rows.length > 0;
      const sources: PartnerSource[] = rows
        .filter((r) => Number(r.quantity) > 0)
        .map((r) => ({
          partner_id: r.partner_id,
          partner_name: r.partner_name,
          partner_price: Number(r.partner_price),
          partner_currency: normalizePartnerCurrency(r.partner_currency),
          location_id: r.location_id,
          location_name: r.location_name,
          location_address: r.location_address,
          attendant_name: r.attendant_name,
          quantity: Number(r.quantity),
          pickup_enabled: r.pickup_enabled !== false,
          delivery_enabled: r.delivery_enabled !== false,
          priority: Number(r.priority ?? 0),
        }));
      sources.sort((a, b) => b.priority - a.priority || a.partner_name.localeCompare(b.partner_name));

      // Fuente propia: stock propio confirmado; o stock legado si el producto
      // aún no está configurado en el sistema de socios (transición).
      const effectiveOwn = effectiveOwnStock(own, legacyStock, configured);
      setOwnQty(effectiveOwn);
      setPartnerSources(sources);
      if (effectiveOwn > 0) {
        setSource({ type: "own" });
      } else if (sources.length > 0) {
        setSource({ type: "partner", source: sources[0] });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("No se pudieron cargar las fuentes: " + msg);
    } finally {
      setLoadingSources(false);
    }
  };

  // Pre-rellenar precio y moneda al elegir producto.
  const handleSelectProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setFinalPrice(String(Number(p.price)));
      setCurrency(p.currency.toUpperCase() === "CUP" ? "CUP" : "USD");
      void loadSources(id, p.own_stock, p.stock);
    }
  };

  const priceNum = Number(finalPrice);
  const basePrice = selectedProduct ? Number(selectedProduct.price) : 0;
  const baseCurrency = selectedProduct ? selectedProduct.currency.toUpperCase() : "";
  // Solo hay markup si ambas monedas coinciden (si difieren, markup = 0).
  const markup = selectedProduct && currency === baseCurrency ? Math.max(0, priceNum - basePrice) : 0;
  const hasMarkup = Number.isFinite(markup) && markup > 0;

  const isPartnerSale = source?.type === "partner";
  const partnerSource = isPartnerSale ? (source as { type: "partner"; source: PartnerSource }).source : null;

  // Comisión: en ventas de socio no hay comisión automática (el margen queda para Mel).
  const commission = isPartnerSale ? 0 : hasMarkup ? 0 : BASE_COMMISSION_CUP;

  // Margen de Mel en una venta de socio (en USD).
  const usdToCupRate = rate?.usd_to_cup ?? null;
  const priceUsd = toUsd(priceNum, currency, usdToCupRate);
  const partnerPriceUsd = partnerSource
    ? toUsd(partnerSource.partner_price, partnerSource.partner_currency, usdToCupRate)
    : NaN;
  const partnerMarginUsd = partnerSource
    ? calcPartnerMarginUsd(priceNum, currency, partnerSource.partner_price, partnerSource.partner_currency, usdToCupRate)
    : NaN;

  const sourceLabel = (s: SaleSource): string =>
    s.type === "own" ? "Propio (en tu casa)" : `${s.source.partner_name} — ${s.source.location_name}`;

  const handleSave = async () => {
    if (!selectedProduct) {
      toast.error("Elige el producto vendido.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("El precio final debe ser un número mayor que 0.");
      return;
    }
    if (!source) {
      toast.error("Elige de dónde se surte la venta.");
      return;
    }
    if (isPartnerSale && !Number.isFinite(partnerMarginUsd)) {
      toast.error("No se pudo calcular el margen en USD (falta la tasa de cambio).");
      return;
    }
    if (isPartnerSale && partnerSource) {
      if (deliveryType === "recogida" && !partnerSource.pickup_enabled) {
        toast.error("Ese local no ofrece recogida. Elige mensajería u otra fuente.");
        return;
      }
      if (deliveryType === "mensajeria" && !partnerSource.delivery_enabled) {
        toast.error("Ese local no ofrece mensajería. Elige recogida u otra fuente.");
        return;
      }
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("No hay sesión activa. Vuelve a entrar a tu cuenta.");

      let sellerName = user.email ?? "Gestor";
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", user.id)
          .maybeSingle();
        const p = profile as { full_name?: string | null; username?: string | null } | null;
        sellerName = p?.full_name?.trim() || p?.username?.trim() || user.email || "Gestor";
      } catch {
        // Se queda con el email si el profile no se puede leer.
      }

      const sourceText = isPartnerSale && partnerSource
        ? `Surtido en socio: ${partnerSource.partner_name} — ${partnerSource.location_name} (${deliveryType === "recogida" ? "recogida" : "mensajería"})`
        : `Surtido propio (${deliveryType === "recogida" ? "recogida" : "mensajería"})`;

      const saleDetails = buildSaleDetails({
        basePrice,
        baseCurrency,
        markupAmount: hasMarkup && !isPartnerSale ? markup : 0,
        isOwnerSale: false,
        detailText: [sourceText, notes.trim() === "" ? null : notes.trim()].filter(Boolean).join(" · "),
      });

      const locationName = isPartnerSale && partnerSource
        ? `${partnerSource.partner_name} — ${partnerSource.location_name}`
        : null;

      // Intento principal: función transaccional (requiere la migración de socios).
      // Si aún no está aplicada, se usa el insert directo anterior.
      let saved = false;
      try {
        const { data: saleId, error } = await supabase.rpc("register_sale_with_fulfillment", {
          p_seller_user_id: user.id,
          p_seller_name: sellerName,
          p_product_id: selectedProduct.id,
          p_product_name: selectedProduct.name,
          p_price: priceNum,
          p_currency: currency,
          p_customer_name: customerName.trim(),
          p_customer_phone: customerPhone.trim(),
          p_commission_amount: commission,
          p_commission_currency: "CUP",
          p_sale_details: saleDetails,
          p_delivery_type: deliveryType,
          p_source_type: isPartnerSale ? "partner" : "own",
          p_partner_id: partnerSource?.partner_id ?? null,
          p_partner_location_id: partnerSource?.location_id ?? null,
          p_location_name: locationName,
        });
        if (error) throw error;
        void saleId;
        saved = true;
      } catch (rpcError: unknown) {
        const msg = rpcError instanceof Error ? rpcError.message : String(rpcError);
        if (!/does not exist|Could not find|not found/i.test(msg)) throw rpcError;
        // Fallback: insert directo (sin surtido por socio).
        const { error } = await supabase.from("seller_sales").insert({
          seller_user_id: user.id,
          seller_name: sellerName,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          price: priceNum,
          currency,
          customer_name: customerName.trim() === "" ? null : customerName.trim(),
          customer_phone: customerPhone.trim() === "" ? null : customerPhone.trim(),
          commission_amount: commission,
          commission_currency: "CUP",
          sale_details: saleDetails,
          delivery_type: deliveryType,
        });
        if (error) throw error;
        saved = true;
      }
      if (!saved) throw new Error("No se pudo guardar la venta.");

      if (isPartnerSale && partnerSource && Number.isFinite(partnerMarginUsd)) {
        toast.success(
          `Venta registrada en ${partnerSource.partner_name}. El socio retiene ${formatMoney(partnerSource.partner_price, partnerSource.partner_currency)} y tu margen de $${partnerMarginUsd.toFixed(2)} USD queda pendiente de recoger.`,
          { duration: 6000 },
        );
      } else {
        toast.success(
          hasMarkup
            ? `Venta registrada. Te quedas el markup de ${formatMoney(markup, currency)}.`
            : `Venta registrada. Comisión ganada: ${formatCUP(commission)}.`,
        );
      }
      onSaved();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error("No se pudo registrar la venta: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  const hasSources = ownQty > 0 || partnerSources.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-[2rem] border-white/70 max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Registrar venta</DialogTitle>
          <DialogDescription>
            Anota aquí cada venta que cierres. Tu comisión o tu markup se calculan solos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rv-product">Producto *</Label>
            <Select value={productId} onValueChange={handleSelectProduct} disabled={loadingProducts}>
              <SelectTrigger id="rv-product" className="rounded-2xl bg-white/80">
                <SelectValue placeholder={loadingProducts ? "Cargando productos…" : "Elige el producto"} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatMoney(Number(p.price), p.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fuente de surtido */}
          {selectedProduct && (
            <div className="space-y-2">
              <Label>¿De dónde se surte? *</Label>
              {loadingSources ? (
                <p className="text-sm text-slate-500">Cargando fuentes…</p>
              ) : !hasSources ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Sin stock registrado en ninguna fuente. Revisa el inventario antes de vender.
                </p>
              ) : (
                <div className="grid gap-2">
                  {ownQty > 0 && (
                    <button
                      type="button"
                      onClick={() => setSource({ type: "own" })}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${source?.type === "own" ? "border-brand-500 bg-brand-100/70" : "border-slate-200 bg-white/80 hover:border-brand-300"}`}
                    >
                      <Home className="h-4 w-4 shrink-0 text-brand-600" />
                      <span className="flex-1">
                        <span className="font-semibold text-slate-900">Propio</span>
                        <span className="text-slate-500"> — en tu casa ({ownQty} u.)</span>
                      </span>
                      {source?.type === "own" && <Badge className="bg-brand-600 text-white border-0">elegido</Badge>}
                    </button>
                  )}
                  {partnerSources.map((s) => {
                    const selected = source?.type === "partner" && (source as { source: PartnerSource }).source.location_id === s.location_id;
                    return (
                      <button
                        key={s.location_id}
                        type="button"
                        onClick={() => setSource({ type: "partner", source: s })}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${selected ? "border-grape-500 bg-grape-100/60" : "border-slate-200 bg-white/80 hover:border-grape-300"}`}
                      >
                        <Handshake className="h-4 w-4 shrink-0 text-grape-600" />
                        <span className="flex-1">
                          <span className="font-semibold text-slate-900">{s.partner_name}</span>
                          <span className="text-slate-500"> — {s.location_name} ({s.quantity} u.)</span>
                          {s.attendant_name && (
                            <span className="block text-xs text-slate-400">Atiende: {s.attendant_name}</span>
                          )}
                          {(!s.pickup_enabled || !s.delivery_enabled) && (
                            <span className="block text-xs text-amber-600">
                              {[!s.pickup_enabled ? "sin recogida" : null, !s.delivery_enabled ? "sin mensajería" : null].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                        {selected && <Badge className="bg-grape-600 text-white border-0">elegido</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Panel interno de socio */}
          {isPartnerSale && partnerSource && (
            <div className="rounded-2xl bg-grape-100/70 border border-grape-200 px-4 py-3 text-sm text-slate-700 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Handshake className="h-4 w-4 text-grape-600" /> Venta en socio (interno)
              </div>
              <div>
                El cliente paga <span className="font-semibold text-slate-900">{formatMoney(priceNum, currency)}</span>
                {" "}en {partnerSource.location_name}.
              </div>
              <div>
                El socio retiene <span className="font-semibold text-slate-900">{formatMoney(partnerSource.partner_price, partnerSource.partner_currency)}</span>
                {Number.isFinite(partnerMarginUsd) && (
                  <> y tu margen de <span className="font-semibold text-emerald-700">${partnerMarginUsd.toFixed(2)} USD</span> queda pendiente de recoger.</>
                )}
              </div>
              <div className="text-xs text-slate-500">Esta venta no genera comisión automática.</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rv-customer">Nombre del cliente</Label>
              <Input
                id="rv-customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="¿A quién le vendiste?"
                className="rounded-2xl bg-white/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rv-phone">Teléfono del cliente</Label>
              <Input
                id="rv-phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+53 …"
                inputMode="tel"
                className="rounded-2xl bg-white/80"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rv-price">Precio final *</Label>
              <Input
                id="rv-price"
                type="number"
                min="0"
                step="0.01"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder="0.00"
                className="rounded-2xl bg-white/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rv-currency">Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as "USD" | "CUP")}>
                <SelectTrigger id="rv-currency" className="rounded-2xl bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CUP">CUP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Entrega</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType("recogida")}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${deliveryType === "recogida" ? "border-brand-500 bg-brand-100/70 text-slate-900" : "border-slate-200 bg-white/80 text-slate-600"}`}
              >
                <User className="h-4 w-4" /> Recogida
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType("mensajeria")}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${deliveryType === "mensajeria" ? "border-brand-500 bg-brand-100/70 text-slate-900" : "border-slate-200 bg-white/80 text-slate-600"}`}
              >
                <Truck className="h-4 w-4" /> Mensajería
              </button>
            </div>
          </div>

          {selectedProduct && !isPartnerSale && (
            <div className="rounded-2xl bg-brand-100/70 border border-brand-200 px-4 py-3 text-sm text-slate-700 space-y-1">
              <div>
                Precio base del producto:{" "}
                <span className="font-semibold text-slate-900">{formatMoney(basePrice, baseCurrency)}</span>
              </div>
              {source && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" /> Se surte: {sourceLabel(source)}
                </div>
              )}
              {Number.isFinite(priceNum) && priceNum > 0 && (
                <div>
                  {hasMarkup ? (
                    <>
                      La vendiste por encima del base: te quedas el markup de{" "}
                      <span className="font-semibold text-slate-900">{formatMoney(markup, currency)}</span>{" "}
                      <Badge className="ml-1 bg-grape-600 text-white border-0">markup</Badge>
                    </>
                  ) : (
                    <>
                      Venta al precio base: ganas{" "}
                      <span className="font-semibold text-slate-900">{formatCUP(commission)}</span> de comisión{" "}
                      <Badge className="ml-1 bg-brand-100 text-brand-700 border border-brand-200">comisión</Badge>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rv-notes">Notas</Label>
            <Textarea
              id="rv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalle de la venta (opcional)"
              rows={3}
              className="rounded-2xl bg-white/80"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} className="nc-btn-primary rounded-2xl" disabled={saving || !source}>
            {saving ? "Guardando…" : "Guardar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RegistrarVentaDialog;

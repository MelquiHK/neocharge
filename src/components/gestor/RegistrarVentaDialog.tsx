import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildSaleDetails } from "@/lib/sales";
import { formatCUP, formatMoney } from "@/lib/format";
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
}

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
  const [notes, setNotes] = useState("");

  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  // Pre-rellenar precio y moneda al elegir producto.
  const handleSelectProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setFinalPrice(String(Number(p.price)));
      setCurrency(p.currency.toUpperCase() === "CUP" ? "CUP" : "USD");
    }
  };

  // Carga productos la primera vez que se abre (y resetea el formulario).
  useEffect(() => {
    if (!open) return;
    setProductId("");
    setCustomerName("");
    setCustomerPhone("");
    setFinalPrice("");
    setCurrency("USD");
    setNotes("");
    if (products.length > 0) return;
    const load = async () => {
      setLoadingProducts(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, currency, price_cup")
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

  const priceNum = Number(finalPrice);
  const basePrice = selectedProduct ? Number(selectedProduct.price) : 0;
  const baseCurrency = selectedProduct ? selectedProduct.currency.toUpperCase() : "";
  // Solo hay markup si ambas monedas coinciden (si difieren, markup = 0).
  const markup = selectedProduct && currency === baseCurrency ? Math.max(0, priceNum - basePrice) : 0;
  const hasMarkup = Number.isFinite(markup) && markup > 0;
  const commission = hasMarkup ? 0 : BASE_COMMISSION_CUP;

  const handleSave = async () => {
    if (!selectedProduct) {
      toast.error("Elige el producto vendido.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("El precio final debe ser un número mayor que 0.");
      return;
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

      const saleDetails = buildSaleDetails({
        basePrice,
        baseCurrency,
        markupAmount: hasMarkup ? markup : 0,
        isOwnerSale: false,
        detailText: notes.trim() === "" ? null : notes.trim(),
      });

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
      });
      if (error) throw error;

      toast.success(
        hasMarkup
          ? `Venta registrada. Te quedas el markup de ${formatMoney(markup, currency)}.`
          : `Venta registrada. Comisión ganada: ${formatCUP(commission)}.`,
      );
      onSaved();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error("No se pudo registrar la venta: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

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

          {selectedProduct && (
            <div className="rounded-2xl bg-brand-100/70 border border-brand-200 px-4 py-3 text-sm text-slate-700 space-y-1">
              <div>
                Precio base del producto:{" "}
                <span className="font-semibold text-slate-900">{formatMoney(basePrice, baseCurrency)}</span>
              </div>
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
          <Button type="button" onClick={handleSave} className="nc-btn-primary rounded-2xl" disabled={saving}>
            {saving ? "Guardando…" : "Guardar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RegistrarVentaDialog;

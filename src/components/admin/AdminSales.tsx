import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminSales } from "@/hooks/admin/use-admin-sales";
import { useAuth } from "@/hooks/use-auth";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { toast } from "sonner";
import { formatPrice, formatCUP } from "@/lib/format";
import { BadgeCheck, DollarSign, ShieldCheck, Trash2, Eye, MapPin, Phone, User, FileText, Wallet, ArrowUpRight, CheckCircle2, Clock, TrendingUp, ShieldAlert, AlertCircle, Pencil, Save, HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  parseSaleDetails,
  buildSaleDetails,
  getSaleOwed,
  computeOwnerSalesSummary,
  toCUP,
  type SellerSale,
  type OwnerSellerSummary,
} from "@/lib/sales";
import {
  AdminCard,
  AdminCardTitle,
  AdminEmptyState,
  AdminFilters,
  AdminLoading,
  AdminSectionHeader,
  AdminStat,
  AdminTable,
  AdminTableHead,
  StatusBadge,
  adminTd,
  adminTh,
  adminTr,
} from "./ui";

interface ProductOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  price_cup: number | null;
}

interface StoredLocation {
  id: string;
  name: string;
}

const DEFAULT_COMMISSION_CUP = 2000;

/** Formatea un monto en su moneda (USD → $X, CUP → X CUP). */
function formatMoney(value: number, currency: string | null | undefined) {
  return (currency ?? "USD").toUpperCase() === "CUP" ? formatCUP(value) : formatPrice(value);
}

export function AdminSales() {
  const { user, permissions } = useAuth();
  const { sales, loading, createSale, updateSale, markPaid, removeSale } = useAdminSales();
  const { rate } = useExchangeRate();
  const rateValue = rate?.usd_to_cup ?? 0;

  /* ---------------- Formulario ---------------- */
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState<number | string>(0);
  const [currency, setCurrency] = useState("USD");
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerKey, setSellerKey] = useState("mel");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [locationName, setLocationName] = useState("");
  const [saleDetails, setSaleDetails] = useState("");
  const [commissionAmount, setCommissionAmount] = useState<number | string>(DEFAULT_COMMISSION_CUP);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  /* ---------------- Filtros / modales ---------------- */
  const [filterSeller, setFilterSeller] = useState("all");
  const [selectedSale, setSelectedSale] = useState<SellerSale | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditGestor, setAuditGestor] = useState<OwnerSellerSummary | null>(null);

  /* ---------------- Edición (modal detalle, solo dueño) ---------------- */
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState<number | string>(0);
  const [editCommission, setEditCommission] = useState<number | string>(0);
  const [editCustomer, setEditCustomer] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDetails, setEditDetails] = useState("");

  /* ---------------- Pagos (modal detalle, solo dueño) ---------------- */
  const [payAmount, setPayAmount] = useState<number | string>("");

  const isOwner = permissions.is_owner;

  useEffect(() => {
    if (user) setSellerName(user.user_metadata?.full_name ?? user.email ?? "");
  }, [user]);

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, currency, price_cup")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error) setProductOptions((data ?? []) as ProductOption[]);
    };

    void loadProducts();
  }, []);

  /* Vendedores conocidos (para filtro y selector del dueño). */
  const sellers = useMemo(() => {
    const map = new Map<string, { key: string; userId: string | null; label: string }>();
    sales.forEach((s) => {
      const key = s.seller_user_id ?? s.seller_name ?? "unknown";
      if (!map.has(key)) {
        map.set(key, { key, userId: s.seller_user_id ?? null, label: s.seller_name || "Gestor" });
      }
    });
    return Array.from(map.values());
  }, [sales]);

  /* Opciones del selector "Vendedor" del dueño: "Yo (Mel)" + gestores. */
  const sellerOptions = useMemo(() => {
    if (!isOwner) return [];
    const options = [{ key: "mel", userId: user?.id ?? null, label: "Yo (Mel)" }];
    for (const s of sellers) {
      if (s.key !== (user?.id ?? "mel")) options.push(s);
    }
    return options;
  }, [isOwner, sellers, user?.id]);

  const selectedSeller = useMemo(
    () => sellerOptions.find((o) => o.key === sellerKey) ?? sellerOptions[0],
    [sellerOptions, sellerKey]
  );

  /* La venta es del dueño cuando él elige "Yo (Mel)": no genera deuda. */
  const formIsOwnerSale = isOwner && sellerKey === "mel";

  /* Markup en vivo: precio de venta − precio base (puede ser ≤ 0). */
  const formMarkup = useMemo(() => {
    if (basePrice == null) return null;
    const salePrice = Number(price || 0);
    if (!Number.isFinite(salePrice)) return null;
    return salePrice - basePrice;
  }, [price, basePrice]);

  /* Vista previa en vivo de lo que Mel le deberá al gestor. */
  const formPreview = useMemo(() => {
    const tempSale: SellerSale = {
      id: "preview",
      sale_details: buildSaleDetails({
        basePrice,
        baseCurrency,
        markupAmount: formMarkup,
        isOwnerSale: formIsOwnerSale,
        detailText: saleDetails.trim() || null,
      }),
      currency,
      commission_amount: Number(commissionAmount || 0),
      commission_currency: "CUP",
    };
    const owed = getSaleOwed(tempSale, rateValue);
    const markupCUP = Math.max(0, toCUP(formMarkup ?? 0, currency, rateValue));
    const applies: "owner" | "markup" | "commission" = formIsOwnerSale
      ? "owner"
      : markupCUP > 0
        ? "markup"
        : "commission";
    return { owed, applies };
  }, [basePrice, baseCurrency, formMarkup, formIsOwnerSale, saleDetails, currency, commissionAmount, rateValue]);

  const handleSellerKeyChange = (next: string) => {
    const wasMel = sellerKey === "mel";
    setSellerKey(next);
    if (next === "mel") {
      // Venta del dueño: comisión forzada a 0.
      setCommissionAmount(0);
    } else if (wasMel) {
      // Volviendo a un gestor: se restaura el default.
      setCommissionAmount(DEFAULT_COMMISSION_CUP);
    }
  };

  const handleProductSelect = (value: string) => {
    const selected = productOptions.find((p) => p.id === value);
    if (!selected) return;
    const prodCurrency = selected.currency || "USD";
    const prodPrice = prodCurrency === "CUP" ? (selected.price_cup ?? selected.price) : selected.price;
    setProductId(value);
    setProductName(selected.name);
    setBasePrice(prodPrice);
    setBaseCurrency(prodCurrency);
    // El precio de venta defaultea al base y la moneda se bloquea.
    setPrice(prodPrice);
    setCurrency(prodCurrency);
  };

  const handleProductNameChange = (value: string) => {
    setProductName(value);
    if (productId !== null) {
      // Nombre libre sin producto elegido: base nula y moneda editable.
      setProductId(null);
      setBasePrice(null);
      setBaseCurrency(null);
    }
  };

  const resetForm = () => {
    setProductId(null);
    setProductName("");
    setPrice(0);
    setCurrency("USD");
    setBasePrice(null);
    setBaseCurrency(null);
    setCustomerName("");
    setCustomerPhone("");
    setLocationName("");
    setSaleDetails("");
    setSellerKey("mel");
    setCommissionAmount(isOwner ? 0 : DEFAULT_COMMISSION_CUP);
  };

  const submit = async () => {
    if (!productName.trim()) {
      toast.error("Selecciona un producto antes de registrar la venta.");
      return;
    }

    try {
      const tempSale: SellerSale = {
        id: "preview",
        sale_details: buildSaleDetails({
          basePrice,
          baseCurrency,
          markupAmount: formMarkup,
          isOwnerSale: formIsOwnerSale,
          detailText: saleDetails.trim() || null,
        }),
        currency,
        commission_amount: Number(commissionAmount || 0),
        commission_currency: "CUP",
      };
      const owedCUP = getSaleOwed(tempSale, rateValue);

      const payload: Record<string, unknown> = {
        product_id: productId,
        product_name: productName,
        price: Number(price || 0),
        currency,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_name: locationName,
        sale_details: buildSaleDetails({
          basePrice,
          baseCurrency,
          markupAmount: formMarkup,
          isOwnerSale: formIsOwnerSale,
          detailText: saleDetails.trim() || null,
        }),
        commission_amount: Number(commissionAmount || 0),
        commission_currency: "CUP",
        amount_to_receive: Math.round(owedCUP),
      };

      if (isOwner) {
        // El dueño puede registrar a nombre de "Yo (Mel)" o de un gestor.
        payload.seller_user_id = selectedSeller?.userId ?? null;
        payload.seller_name = selectedSeller?.label ?? "Gestor";
        payload.notes = `Venta registrada por el dueño a nombre de ${selectedSeller?.label ?? "Gestor"}`;
      } else {
        payload.seller_name = sellerName || user?.email || "Gestor";
        payload.notes = `Venta registrada por ${sellerName || user?.email || "Gestor"}`;
      }

      await createSale(payload);
      toast.success("Venta registrada");
      resetForm();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : null) || "Error creando venta");
    }
  };

  const filteredSales = useMemo(() => {
    const visibleSales = permissions.is_owner
      ? sales
      : sales.filter((s) => s.seller_user_id === user?.id || s.seller_name === sellerName || s.seller_name === user?.email);

    if (filterSeller === "all") return visibleSales;
    return visibleSales.filter((s) => (s.seller_user_id ?? s.seller_name) === filterSeller);
  }, [filterSeller, permissions.is_owner, sales, sellerName, user?.email, user?.id]);

  /* Fuente única de verdad para comisiones/caja, normalizada a CUP. */
  const summary = useMemo(
    () => computeOwnerSalesSummary(filteredSales, rateValue),
    [filteredSales, rateValue]
  );

  /* Resumen semanal: últimos 7 días. */
  const weeklySummary = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklySales = filteredSales.filter(
      (s) => s.created_at && new Date(s.created_at) >= sevenDaysAgo
    );
    return computeOwnerSalesSummary(weeklySales, rateValue);
  }, [filteredSales, rateValue]);

  /* ---------- Modal detalle: derivados de la venta seleccionada ---------- */
  const selectedMeta = useMemo(
    () => (selectedSale ? parseSaleDetails(selectedSale) : null),
    [selectedSale]
  );
  const selectedOwed = selectedSale ? getSaleOwed(selectedSale, rateValue) : 0;
  const selectedPaid = selectedSale
    ? toCUP(
        selectedSale.commission_paid_amount ?? (selectedSale.is_paid ? selectedOwed : 0),
        selectedSale.commission_currency ?? "CUP",
        rateValue
      )
    : 0;
  const selectedPending = Math.max(0, selectedOwed - selectedPaid);
  const selectedApplies: "owner" | "markup" | "commission" = selectedMeta?.isOwnerSale
    ? "owner"
    : Math.max(0, toCUP(selectedMeta?.markupAmount ?? 0, selectedSale?.currency ?? "USD", rateValue)) > 0
      ? "markup"
      : "commission";
  const appliesLabel =
    selectedApplies === "owner"
      ? "Venta del dueño"
      : selectedApplies === "markup"
        ? "Aplica: markup"
        : "Aplica: comisión";

  const openDetails = (sale: SellerSale) => {
    setSelectedSale(sale);
    setIsEditing(false);
    setPayAmount("");
    setIsDetailsOpen(true);
  };

  const startEdit = () => {
    if (!selectedSale) return;
    setEditPrice(Number(selectedSale.price ?? 0));
    setEditCommission(Number(selectedSale.commission_amount ?? 0));
    setEditCustomer(selectedSale.customer_name ?? "");
    setEditPhone(selectedSale.customer_phone ?? "");
    setEditLocation(selectedSale.location_name ?? "");
    setEditDetails(selectedMeta?.detailText ?? "");
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!selectedSale) return;
    try {
      const meta = parseSaleDetails(selectedSale);
      const newPrice = Number(editPrice || 0);
      const saleCurrency = (selectedSale.currency ?? "USD").toUpperCase();
      const baseCurrencyNorm = (meta.baseCurrency ?? "USD").toUpperCase();
      // Se recalcula el markup contra el precio base original.
      const newMarkup =
        meta.basePrice != null && saleCurrency === baseCurrencyNorm
          ? newPrice - meta.basePrice
          : meta.markupAmount;
      const details = buildSaleDetails({
        basePrice: meta.basePrice,
        baseCurrency: meta.baseCurrency,
        markupAmount: newMarkup,
        isOwnerSale: meta.isOwnerSale,
        detailText: editDetails.trim() || null,
      });
      const tempSale: SellerSale = {
        ...selectedSale,
        price: newPrice,
        commission_amount: Number(editCommission || 0),
        sale_details: details,
      };
      const nuevoOwed = getSaleOwed(tempSale, rateValue);
      const patch = {
        price: newPrice,
        commission_amount: Number(editCommission || 0),
        customer_name: editCustomer,
        customer_phone: editPhone,
        location_name: editLocation,
        sale_details: details,
        amount_to_receive: Math.round(nuevoOwed),
      };
      const updated = await updateSale(selectedSale.id, patch);
      setSelectedSale(updated as SellerSale);
      setIsEditing(false);
      toast.success("Venta actualizada");
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : null) || "No se pudo actualizar la venta");
    }
  };

  const registerPayment = async () => {
    if (!selectedSale) return;
    const amount = Number(payAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Escribe un monto válido mayor que cero.");
      return;
    }
    try {
      const newPaid = selectedPaid + amount;
      const updated = await updateSale(selectedSale.id, {
        commission_paid_amount: newPaid,
        is_paid: newPaid >= selectedOwed,
      });
      setSelectedSale(updated as SellerSale);
      setPayAmount("");
      toast.success("Pago registrado");
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : null) || "No se pudo registrar el pago");
    }
  };

  const markAllPaid = async () => {
    if (!selectedSale) return;
    try {
      const updated = await updateSale(selectedSale.id, {
        commission_paid_amount: selectedOwed,
        is_paid: true,
      });
      setSelectedSale(updated as SellerSale);
      toast.success("Venta marcada como pagada");
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : null) || "No se pudo actualizar");
    }
  };

  const markupTone = (m: number | null): "success" | "danger" | "neutral" =>
    m == null ? "neutral" : m > 0 ? "success" : m < 0 ? "danger" : "neutral";

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={TrendingUp}
        title="Ventas"
        description="Historial de transacciones y métricas financieras."
        actions={
          <div className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            Total USD: {formatPrice(summary.totalUSD)} — Total CUP: {formatCUP(summary.totalCUP)}
          </div>
        }
      />

      {!isOwner && (
        <AdminCard className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" /> Panel de gestor
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Tus ventas solo son visibles para ti y para el administrador principal.</p>
        </AdminCard>
      )}

      {/* Formulario de registro: visible para dueño y gestores. */}
      <AdminCard>
        <AdminCardTitle icon={FileText} title="Registrar venta" />
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select
                value={productId ?? undefined}
                onValueChange={handleProductSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} — {product.currency === "CUP" ? `${product.price_cup ?? product.price} CUP` : `${product.price} USD`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nombre del producto</Label>
              <Input value={productName} onChange={(e) => handleProductNameChange(e.target.value)} placeholder="Nombre o referencia del producto" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Precio de venta</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Moneda{productId !== null ? " (bloqueada al producto)" : ""}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v)} disabled={productId !== null}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CUP">CUP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isOwner ? (
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={sellerKey} onValueChange={handleSellerKeyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sellerOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Comisión (CUP)</Label>
                <Input type="number" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} placeholder="Ej: 2000" />
              </div>
            )}
          </div>

          {isOwner && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Comisión (CUP){formIsOwnerSale ? " (venta del dueño: 0)" : ""}</Label>
                <Input
                  type="number"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(e.target.value)}
                  placeholder="Ej: 2000"
                  disabled={formIsOwnerSale}
                />
              </div>
              <div className="space-y-2">
                <Label>Detalles de la venta (Opcional)</Label>
                <Textarea value={saleDetails} onChange={(e) => setSaleDetails(e.target.value)} placeholder="Escribe aquí cualquier detalle adicional..." />
              </div>
            </div>
          )}

          {!isOwner && (
            <div className="space-y-2">
              <Label>Detalles de la venta (Opcional)</Label>
              <Textarea value={saleDetails} onChange={(e) => setSaleDetails(e.target.value)} placeholder="Escribe aquí cualquier detalle adicional..." />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Nombre del Cliente</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Ej: +53 5..." />
            </div>
            <div className="space-y-2">
              <Label>Dirección / Local</Label>
              <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Ej: Calle 10 #5..." />
            </div>
          </div>

          {/* Vista previa en vivo: base, markup, comisión y a pagar. */}
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Precio base</p>
                <p className="text-sm font-semibold">
                  {basePrice != null ? formatMoney(basePrice, baseCurrency) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">Referencia{productId === null ? " (sin producto)" : ""}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Markup</p>
                {formMarkup == null ? (
                  <p className="text-sm font-semibold text-muted-foreground">—</p>
                ) : (
                  <StatusBadge tone={markupTone(formMarkup)}>
                    {formMarkup > 0 ? "+" : ""}{formatMoney(formMarkup, currency)}
                  </StatusBadge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Comisión</p>
                <p className="text-sm font-semibold">{formatCUP(Number(commissionAmount || 0))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">A pagar al gestor</p>
                <p className="font-display text-xl font-bold text-primary">{formatCUP(formPreview.owed)}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-start">
              <StatusBadge
                tone={formPreview.applies === "owner" ? "neutral" : formPreview.applies === "markup" ? "info" : "primary"}
              >
                {formPreview.applies === "owner"
                  ? "Venta del dueño"
                  : formPreview.applies === "markup"
                    ? "Aplica: markup"
                    : "Aplica: comisión"}
              </StatusBadge>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="hero" className="h-10 w-full sm:w-auto" onClick={submit}>Registrar venta</Button>
          </div>
        </div>
      </AdminCard>

      {isOwner && (
        <AdminCard>
          <AdminCardTitle icon={Wallet} title="Control de Comisiones a Gestores" />

          <div className="grid gap-4 sm:grid-cols-3">
            <AdminStat
              icon={ArrowUpRight}
              label="Total por pagar"
              value={formatCUP(summary.pendingCUP)}
              tone="amber"
            />
            <AdminStat
              icon={CheckCircle2}
              label="Total pagado"
              value={formatCUP(summary.paidCUP)}
              tone="emerald"
            />
            <AdminStat
              icon={Clock}
              label="Total a deber"
              value={formatCUP(summary.owedCUP)}
              tone="blue"
            />
          </div>

          <AdminStat
            icon={TrendingUp}
            label="Resumen de esta semana"
            value={formatCUP(weeklySummary.owedCUP)}
            sub={`Últimos 7 días · ${weeklySummary.count} ventas registradas`}
            tone="violet"
            className="mt-4"
          />

          <div className="mt-4">
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <th className={adminTh}>Gestor</th>
                  <th className={adminTh + " text-center"}>Ventas</th>
                  <th className={adminTh + " text-right"}>Pagado</th>
                  <th className={adminTh + " text-right"}>Pendiente</th>
                  <th className={adminTh + " text-right"}>A deber</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {summary.sellers.map((s) => (
                  <tr key={s.key} className={adminTr}>
                    <td className={adminTd}>
                      <div className="flex items-center gap-2 font-medium">
                        {s.sellerName || "Desconocido"}
                        {s.isOwner && <StatusBadge tone="primary">Mel</StatusBadge>}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => { setAuditGestor(s); setIsAuditOpen(true); }} aria-label="Auditar gestor">
                          <ShieldAlert className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className={adminTd + " text-center"}>{s.count}</td>
                    <td className={adminTd + " text-right font-medium text-emerald-600 dark:text-emerald-400"}>{formatCUP(s.paidCUP)}</td>
                    <td className={adminTd + " text-right font-medium text-amber-600 dark:text-amber-400"}>{formatCUP(s.pendingCUP)}</td>
                    <td className={adminTd + " text-right font-bold"}>{formatCUP(s.owedCUP)}</td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </div>
        </AdminCard>
      )}

      {isOwner && (
        <AdminCard>
          <AdminFilters>
            <div className="w-full space-y-2 sm:w-auto">
              <Label>Filtrar por gestor</Label>
              <Select value={filterSeller} onValueChange={setFilterSeller}>
                <SelectTrigger className="h-10 w-full md:w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los gestores</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.key} value={seller.key}>{seller.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground sm:ml-auto">
              <DollarSign className="h-4 w-4 text-primary" />
              {filteredSales.length} ventas visibles
            </div>
          </AdminFilters>
        </AdminCard>
      )}

      <div className="space-y-4">
        {loading ? (
          <AdminLoading label="Cargando ventas…" />
        ) : filteredSales.length === 0 ? (
          <AdminEmptyState
            icon={TrendingUp}
            title="Sin ventas"
            description={isOwner ? "Aún no hay ventas registradas en el panel principal." : "Todavía no has registrado ventas para este gestor."}
          />
        ) : (
          filteredSales.map((sale) => (
            <AdminCard key={sale.id} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{sale.product_name ?? "Producto sin nombre"}</p>
                    <StatusBadge tone={sale.is_paid ? "success" : "warning"}>
                      {sale.is_paid ? "Pagada" : "Pendiente"}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {sale.seller_name || "Gestor sin nombre"} • {new Date(sale.created_at).toLocaleString("es-ES")}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 md:justify-end">
                  <div className="font-display text-lg font-bold text-primary">{sale.currency === "USD" ? formatPrice(Number(sale.price)) : formatCUP(Number(sale.price))}</div>
                  <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => openDetails(sale)} aria-label="Ver detalles">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!sale.is_paid && (
                    <Button size="sm" className="h-9" onClick={async () => { try { await markPaid(sale.id, getSaleOwed(sale, rateValue)); toast.success("Venta marcada como pagada"); } catch (e: unknown) { toast.error((e instanceof Error ? e.message : null) || "No se pudo actualizar"); } }}>
                      Marcar pagada
                    </Button>
                  )}
                  {(isOwner || sale.seller_user_id === user?.id) && (
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" onClick={async () => {
                      if (!confirm("¿Eliminar esta venta?")) return;
                      try { await removeSale(sale.id); toast.success("Venta eliminada"); } catch (e: unknown) { toast.error((e instanceof Error ? e.message : null) || "No se pudo eliminar"); }
                    }} aria-label="Eliminar venta">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </AdminCard>
          ))
        )}
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalles de la Venta
            </DialogTitle>
            <DialogDescription>
              Información completa de la venta registrada.
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="grid gap-6 py-4">
              {isOwner && !isEditing && (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                  </Button>
                </div>
              )}

              {isEditing ? (
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Producto</p>
                    <p className="mt-0.5 font-semibold">{selectedSale.product_name ?? "Producto sin nombre"}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Precio de venta ({(selectedSale.currency ?? "USD").toUpperCase()})</Label>
                      <Input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Comisión (CUP)</Label>
                      <Input type="number" value={editCommission} onChange={(e) => setEditCommission(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Input value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)} placeholder="Nombre del cliente" />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Teléfono del cliente" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación / Dirección</Label>
                    <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Ubicación o dirección" />
                  </div>
                  <div className="space-y-2">
                    <Label>Detalles</Label>
                    <Textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} placeholder="Detalles de la venta" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    <Button onClick={saveEdit}>
                      <Save className="mr-2 h-4 w-4" /> Guardar cambios
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Producto</span>
                      <p className="font-semibold">{selectedSale.product_name}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Precio de Venta</span>
                      <p className="text-lg font-semibold text-primary">
                        {selectedSale.currency === "USD" ? formatPrice(Number(selectedSale.price ?? 0)) : formatCUP(Number(selectedSale.price ?? 0))}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Gestor</span>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p>{selectedSale.seller_name}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Fecha</span>
                      <p>{new Date(selectedSale.created_at).toLocaleString("es-ES")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Cliente</span>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p>{selectedSale.customer_name || "No especificado"}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Teléfono</span>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p>{selectedSale.customer_phone || "No especificado"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-border pt-4">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Ubicación / Dirección</span>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p>{selectedSale.location_name || "No especificado"}</p>
                    </div>
                  </div>

                  {/* Comisión y markup (modelo UNA O LA OTRA). */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Comisión y markup</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">Precio base</span>
                        <p className="font-semibold">
                          {selectedMeta?.basePrice != null
                            ? formatMoney(selectedMeta.basePrice, selectedMeta.baseCurrency)
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">Markup</span>
                        <div>
                          {selectedMeta?.markupAmount == null ? (
                            <p className="font-semibold text-muted-foreground">—</p>
                          ) : (
                            <StatusBadge tone={markupTone(selectedMeta.markupAmount)}>
                              {selectedMeta.markupAmount > 0 ? "+" : ""}
                              {formatMoney(selectedMeta.markupAmount, selectedSale.currency)}
                            </StatusBadge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">Comisión configurada</span>
                        <p className="font-semibold">
                          {formatCUP(toCUP(selectedSale.commission_amount, selectedSale.commission_currency ?? "CUP", rateValue))}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">Pagado</span>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCUP(selectedPaid)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">A pagar al gestor</p>
                        <p className="font-display text-2xl font-bold text-primary">{formatCUP(selectedOwed)}</p>
                      </div>
                      <StatusBadge tone={selectedApplies === "owner" ? "neutral" : selectedApplies === "markup" ? "info" : "primary"}>
                        {appliesLabel}
                      </StatusBadge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pendiente</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{formatCUP(selectedPending)}</span>
                    </div>
                  </div>

                  {/* Pagos (solo dueño). */}
                  {isOwner && (
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                      <AdminCardTitle icon={HandCoins} title="Pagos al gestor" className="mb-1" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-xs font-medium uppercase text-muted-foreground">Pagado</span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCUP(selectedPaid)}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium uppercase text-muted-foreground">Pendiente</span>
                          <p className="font-bold text-amber-600 dark:text-amber-400">{formatCUP(selectedPending)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Monto a registrar (CUP)"
                          className="sm:flex-1"
                        />
                        <Button onClick={registerPayment}>Registrar pago</Button>
                      </div>
                      {selectedPending > 0 && (
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={markAllPaid}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar todo pagado
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Comisión Gestor</span>
                      <p className="font-semibold text-primary">{formatCUP(Number(selectedSale.commission_amount ?? 0))}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Estado de Pago</span>
                      <StatusBadge tone={selectedSale.is_paid ? "success" : "warning"}>
                        {selectedSale.is_paid ? "Pagada al gestor" : "Pendiente de pago"}
                      </StatusBadge>
                    </div>
                  </div>

                  {selectedMeta?.detailText && (
                    <div className="space-y-1 border-t border-border pt-4">
                      <span className="text-xs font-medium uppercase text-muted-foreground">Detalles Adicionales</span>
                      <p className="whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-sm">
                        {selectedMeta.detailText}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl border-border bg-card p-0 shadow-2xl">
          <div className="bg-primary p-6 text-primary-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 font-display text-2xl">
                <ShieldCheck className="h-8 w-8 opacity-80" />
                Auditoría Semanal: {auditGestor?.sellerName}
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/70">
                Revisa las ventas registradas esta semana para detectar posibles irregularidades.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[70vh] overflow-y-auto bg-muted/20 p-6">
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Ventas Semanales</p>
                <p className="text-2xl font-bold text-primary">
                  {filteredSales.filter(s =>
                    (s.seller_user_id === auditGestor?.key || s.seller_name === auditGestor?.sellerName) &&
                    new Date(s.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Total Comisión</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCUP(filteredSales.filter(s =>
                    (s.seller_user_id === auditGestor?.key || s.seller_name === auditGestor?.sellerName) &&
                    new Date(s.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).reduce((a, b) => a + Number(b.commission_amount || 0), 0))}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Alerta de Fraude</p>
                <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Nivel Bajo</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                <AlertCircle className="h-3 w-3" /> Registros de los últimos 7 días
              </h4>
              {filteredSales
                .filter(s =>
                  (s.seller_user_id === auditGestor?.key || s.seller_name === auditGestor?.sellerName) &&
                  new Date(s.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                )
                .map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">{sale.product_name}</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-bold uppercase">
                          {sale.currency}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {sale.customer_name || "Sin cliente"}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {sale.customer_phone || "Sin tlf"}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {sale.location_name || "Sin loc"}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-primary">{formatCUP(Number(sale.commission_amount ?? 0))}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(sale.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

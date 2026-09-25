import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminSales } from "@/hooks/admin/use-admin-sales";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatPrice, formatCUP } from "@/lib/format";
import { BadgeCheck, DollarSign, ShieldCheck, Trash2, Eye, MapPin, Phone, User, FileText, Wallet, ArrowUpRight, CheckCircle2, Clock, TrendingUp, ShieldAlert, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { computeSalesTotalsBySeller, type SellerSale, type SellerTotals } from "@/lib/sales";
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

export function AdminSales() {
  const { user, permissions } = useAuth();
  const { sales, loading, createSale, markPaid, removeSale } = useAdminSales();
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState<number | string>(0);
  const [currency, setCurrency] = useState("USD");
  const [sellerName, setSellerName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [locationName, setLocationName] = useState("");
  const [saleDetails, setSaleDetails] = useState("");
  const [commissionAmount, setCommissionAmount] = useState<number | string>(2000);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [filterSeller, setFilterSeller] = useState("all");
  const [selectedSale, setSelectedSale] = useState<SellerSale | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditGestor, setAuditGestor] = useState<SellerTotals | null>(null);

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

  const submit = async () => {
    if (!productName.trim()) {
      toast.error("Selecciona un producto antes de registrar la venta.");
      return;
    }

    try {
      const payload = {
        product_id: productId,
        product_name: productName,
        seller_user_id: user?.id ?? null,
        seller_name: sellerName || user?.email || "Gestor",
        price: Number(price || 0),
        currency,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_name: locationName,
        sale_details: saleDetails,
        commission_amount: Number(commissionAmount || 0),
        commission_currency: "CUP",
        amount_to_receive: Number(price || 0),
        notes: `Venta registrada por ${sellerName || user?.email || "Gestor"}`,
      };
      await createSale(payload);
      toast.success("Venta registrada");
      setProductId(null);
      setProductName("");
      setPrice(0);
      setCurrency("USD");
      setCustomerName("");
      setCustomerPhone("");
      setLocationName("");
      setSaleDetails("");
      setCommissionAmount(2000);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : null) || "Error creando venta");
    }
  };

  const filteredSales = useMemo(() => {
    const visibleSales = permissions.is_owner ? sales : sales.filter((s) => s.seller_user_id === user?.id || s.seller_name === sellerName || s.seller_name === user?.email);

    if (filterSeller === "all") return visibleSales;
    return visibleSales.filter((s) => (s.seller_user_id ?? s.seller_name) === filterSeller);
  }, [filterSeller, permissions.is_owner, sales, sellerName, user?.email, user?.id]);

  const totals = useMemo(() => {
    const totalUSD = filteredSales.filter((s) => s.currency === "USD").reduce((a, b) => a + Number(b.price || 0), 0);
    const totalCUP = filteredSales.filter((s) => s.currency === "CUP").reduce((a, b) => a + Number(b.price || 0), 0);

    // Calculate total commissions
    const stats = computeSalesTotalsBySeller(filteredSales);
    const totalCommissionPending = stats.bySeller.reduce((a, b) => a + b.pendingCommission, 0);
    const totalCommissionPaid = stats.bySeller.reduce((a, b) => a + b.paidCommission, 0);

    // Calculate weekly summary (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklySales = filteredSales.filter(s => new Date(s.created_at) >= sevenDaysAgo);
    const weeklyStats = computeSalesTotalsBySeller(weeklySales);
    const weeklyCommission = weeklyStats.bySeller.reduce((a, b) => a + b.totalCommission, 0);

    return { totalUSD, totalCUP, stats, totalCommissionPending, totalCommissionPaid, weeklyCommission, weeklySalesCount: weeklySales.length };
  }, [filteredSales]);

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach((s) => {
      const key = s.seller_user_id ?? s.seller_name ?? "unknown";
      if (!map.has(key)) map.set(key, s.seller_name || "Gestor");
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [sales]);

  const isOwner = permissions.is_owner;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={TrendingUp}
        title="Ventas"
        description="Historial de transacciones y métricas financieras."
        actions={
          <div className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            Total USD: {formatPrice(totals.totalUSD)} — Total CUP: {formatCUP(totals.totalCUP)}
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

      {!isOwner && (
        <AdminCard>
          <AdminCardTitle icon={FileText} title="Registrar venta" />
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select
                  value={productId ?? undefined}
                  onValueChange={(value) => {
                    const selected = productOptions.find((p) => p.id === value);
                    if (!selected) return;
                    setProductId(value);
                    setProductName(selected.name);
                    setCurrency(selected.currency || "USD");
                    setPrice(selected.currency === "CUP" ? (selected.price_cup ?? selected.price) : selected.price);
                  }}
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
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nombre o referencia del producto" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Precio</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CUP">CUP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gestor</Label>
                <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Nombre del gestor" />
              </div>
            </div>

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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Comisión (CUP)</Label>
                <Input type="number" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} placeholder="Ej: 2000" />
              </div>
              <div className="space-y-2">
                <Label>Detalles de la venta (Opcional)</Label>
                <Textarea value={saleDetails} onChange={(e) => setSaleDetails(e.target.value)} placeholder="Escribe aquí cualquier detalle adicional..." />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="hero" className="h-10 w-full sm:w-auto" onClick={submit}>Registrar venta</Button>
            </div>
          </div>
        </AdminCard>
      )}

      {isOwner && (
        <AdminCard>
          <AdminCardTitle icon={Wallet} title="Control de Comisiones a Gestores" />

          <div className="grid gap-4 sm:grid-cols-3">
            <AdminStat
              icon={ArrowUpRight}
              label="Total por pagar"
              value={formatCUP(totals.totalCommissionPending)}
              tone="amber"
            />
            <AdminStat
              icon={CheckCircle2}
              label="Total pagado"
              value={formatCUP(totals.totalCommissionPaid)}
              tone="emerald"
            />
            <AdminStat
              icon={Clock}
              label="Total acumulado"
              value={formatCUP(totals.totalCommissionPending + totals.totalCommissionPaid)}
              tone="blue"
            />
          </div>

          <AdminStat
            icon={TrendingUp}
            label="Resumen de esta semana"
            value={formatCUP(totals.weeklyCommission)}
            sub={`Últimos 7 días · ${totals.weeklySalesCount} ventas registradas`}
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
                  <th className={adminTh + " text-right"}>Total</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {totals.stats.bySeller.map((s: SellerTotals) => (
                  <tr key={s.seller_user_id || s.seller_name} className={adminTr}>
                    <td className={adminTd}>
                      <div className="flex items-center gap-2 font-medium">
                        {s.seller_name || "Desconocido"}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => { setAuditGestor(s); setIsAuditOpen(true); }} aria-label="Auditar gestor">
                          <ShieldAlert className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className={adminTd + " text-center"}>{s.count}</td>
                    <td className={adminTd + " text-right font-medium text-emerald-600 dark:text-emerald-400"}>{formatCUP(s.paidCommission)}</td>
                    <td className={adminTd + " text-right font-medium text-amber-600 dark:text-amber-400"}>{formatCUP(s.pendingCommission)}</td>
                    <td className={adminTd + " text-right font-bold"}>{formatCUP(s.totalCommission)}</td>
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
                  <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => { setSelectedSale(sale); setIsDetailsOpen(true); }} aria-label="Ver detalles">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!sale.is_paid && (
                    <Button size="sm" className="h-9" onClick={async () => { try { await markPaid(sale.id); toast.success("Venta marcada como pagada"); } catch (e: unknown) { toast.error((e instanceof Error ? e.message : null) || "No se pudo actualizar"); } }}>
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

              {selectedSale.sale_details && (
                <div className="space-y-1 border-t border-border pt-4">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Detalles Adicionales</span>
                  <p className="whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-sm">
                    {String(selectedSale.sale_details ?? "")}
                  </p>
                </div>
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
                Auditoría Semanal: {auditGestor?.seller_name}
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
                    (s.seller_user_id === auditGestor?.seller_user_id || s.seller_name === auditGestor?.seller_name) &&
                    new Date(s.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Total Comisión</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCUP(filteredSales.filter(s =>
                    (s.seller_user_id === auditGestor?.seller_user_id || s.seller_name === auditGestor?.seller_name) &&
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
                  (s.seller_user_id === auditGestor?.seller_user_id || s.seller_name === auditGestor?.seller_name) &&
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

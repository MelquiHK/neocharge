import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatCUP } from "@/lib/format";
import { useAdminSales } from "@/hooks/admin/use-admin-sales";
import { computeOwnerSalesSummary, computeSalesTotalsBySeller } from "@/lib/sales";
import { useCashbox } from "@/hooks/admin/use-cashbox";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useAuth } from "@/hooks/use-auth";
import {
  Package, ShoppingBag, Users, DollarSign, TrendingUp, AlertTriangle, Eye,
  LayoutDashboard, UserCheck, BarChart3, HandCoins, Globe, History, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  AdminCardTitle,
  AdminEmptyState,
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

interface Stats {
  products: number;
  lowStock: number;
  ordersToday: number;
  ordersPending: number;
  revenueMonth: number;
  costsMonth: number;
  customers: number;
  visitsToday: number;
  unique7d: number;
  visits7d: number;
}

type TopPageRow = { path: string; views: number; unique_visitors: number };
type RecentViewRow = { created_at: string; path: string; visitor_id: string };

interface DashboardProduct {
  id: string;
  stock?: number | null;
  low_stock_threshold?: number | null;
  cost_price?: number | string | null;
}

interface DashboardOrder {
  id?: string;
  total?: number | string | null;
  payment_currency?: string | null;
  exchange_rate?: number | string | null;
  items?: unknown;
  customer_name?: string | null;
  customer_phone?: string | null;
  status?: string | null;
  created_at?: string | null;
}

interface OrderItem {
  id?: string;
  product_id?: string;
  quantity?: number | string | null;
}

/** Mapa puramente visual: estado del pedido -> tono del badge. */
function orderStatusTone(status?: string | null): "success" | "warning" | "danger" | "info" | "neutral" | "primary" {
  switch ((status ?? "").toLowerCase()) {
    case "pending":
    case "pendiente":
      return "warning";
    case "confirmed":
    case "confirmado":
      return "info";
    case "completed":
    case "completado":
    case "delivered":
    case "entregado":
      return "success";
    case "cancelled":
    case "canceled":
    case "cancelado":
      return "danger";
    default:
      return "neutral";
  }
}

export function AdminDashboard() {
  const { permissions } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<Stats>({
    products: 0, lowStock: 0, ordersToday: 0, ordersPending: 0,
    revenueMonth: 0, costsMonth: 0, customers: 0,
    visitsToday: 0, unique7d: 0, visits7d: 0,
  });
  const [recent, setRecent] = useState<DashboardOrder[]>([]);
  const [topPages, setTopPages] = useState<TopPageRow[]>([]);
  const [recentViews, setRecentViews] = useState<RecentViewRow[]>([]);
  const [rateMissing, setRateMissing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const [{ count: pCount }, { data: products }, { data: ordersMonth }, { data: ordersToday }, { data: pendingOrders }, { count: cCount }, { data: recentOrders }, traffic, top, recentV, todayRate] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("id,stock,low_stock_threshold,cost_price").eq("is_active", true),
        supabase.from("orders").select("total,items,payment_currency,exchange_rate").gte("created_at", startMonth),
        supabase.from("orders").select("id").gte("created_at", startDay),
        supabase.from("orders").select("id").eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.rpc("traffic_stats", { days: 7 }),
        supabase.rpc("traffic_top_pages", { days: 7, limit_count: 8 }),
        supabase.rpc("traffic_recent_views", { limit_count: 12 }),
        supabase.from("exchange_rates").select("id,usd_to_cup").eq("rate_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
      ]);

      const lowStock = (products ?? []).filter((p: DashboardProduct) => (p.stock ?? 0) <= (p.low_stock_threshold ?? 5)).length;
      const revenue = (ordersMonth ?? []).reduce((s, o: DashboardOrder) => {
        // Si el pedido fue en CUP, lo convertimos a USD para la analítica consolidada
        if (o.payment_currency === "CUP") {
          const rate = o.exchange_rate || todayRate.data?.usd_to_cup || 1;
          return s + (Number(o.total ?? 0) / rate);
        }
        return s + Number(o.total ?? 0);
      }, 0);

      // Calcular costos: sumar cost_price * cantidad por cada item
      const costs = (ordersMonth ?? []).reduce((s, o: DashboardOrder) => {
        const items = Array.isArray(o.items) ? (o.items as OrderItem[]) : [];
        return s + items.reduce((acc: number, it: OrderItem) => {
          const prod = (products as DashboardProduct[] | null)?.find((p) => p.id === it.id || p.id === it.product_id);
          const cost = Number(prod?.cost_price ?? 0);
          return acc + cost * Number(it.quantity ?? 1);
        }, 0);
      }, 0);

      setStats({
        products: pCount ?? 0,
        lowStock,
        ordersToday: (ordersToday ?? []).length,
        ordersPending: (pendingOrders ?? []).length,
        revenueMonth: revenue,
        costsMonth: costs,
        customers: cCount ?? 0,
        visitsToday: Number(traffic.data?.visits_today ?? 0),
        unique7d: Number(traffic.data?.unique_visitors ?? 0),
        visits7d: Number(traffic.data?.visits_total ?? 0),
      });
      setRecent((recentOrders ?? []) as DashboardOrder[]);
      setTopPages((top.data ?? []) as TopPageRow[]);
      setRecentViews((recentV.data ?? []) as RecentViewRow[]);
      setRateMissing(!todayRate.data);
      setLoaded(true);
    };
    load();
  }, []);

  const profit = stats.revenueMonth - stats.costsMonth;
  const margin = stats.revenueMonth > 0 ? (profit / stats.revenueMonth) * 100 : 0;

  const { sales } = useAdminSales();
  const salesTotals = computeSalesTotalsBySeller(sales ?? []);
  const { cashbox } = useCashbox();
  const { rate } = useExchangeRate();
  const rateValue = rate?.usd_to_cup ?? 0;

  const summaryGlobal = computeOwnerSalesSummary(sales ?? [], rateValue);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthSales = (sales ?? []).filter(
    (s) => s.created_at && new Date(s.created_at) >= monthStart
  );
  const summaryMonth = computeOwnerSalesSummary(monthSales, rateValue);

  const cards = [
    { icon: Package, label: "Productos activos", value: stats.products, tone: "blue" as const, sub: "En catálogo" },
    { icon: AlertTriangle, label: "Stock bajo", value: stats.lowStock, tone: "amber" as const, sub: "Necesitan reposición" },
    { icon: ShoppingBag, label: "Pedidos hoy", value: stats.ordersToday, tone: "blue" as const, sub: "Recibidos en el día" },
    { icon: AlertTriangle, label: "Pedidos pendientes", value: stats.ordersPending, tone: "rose" as const, sub: "Por atender" },
    { icon: Users, label: "Clientes registrados", value: stats.customers, tone: "violet" as const, sub: "En la plataforma" },
    { icon: Eye, label: "Visitas hoy", value: stats.visitsToday, tone: "sky" as const, sub: "Tráfico del día" },
    { icon: UserCheck, label: "Visitantes únicos (7d)", value: stats.unique7d, tone: "slate" as const, sub: "Últimos 7 días" },
    { icon: BarChart3, label: "Visitas (7d)", value: stats.visits7d, tone: "emerald" as const, sub: "Últimos 7 días" },
  ];

  if (!loaded) {
    return <AdminLoading label="Cargando resumen…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <AdminSectionHeader
        icon={LayoutDashboard}
        title="Resumen"
        description="El pulso de tu negocio: ventas, pedidos y stock de un vistazo."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <AdminStat
            key={c.label}
            icon={c.icon}
            label={c.label}
            value={c.value}
            sub={c.sub}
            tone={c.tone}
          />
        ))}
      </div>

      {permissions.can_view_finances && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AdminStat
              icon={DollarSign}
              label="Ingresos del mes"
              value={formatPrice(stats.revenueMonth)}
              sub="Mes en curso (USD)"
              tone="emerald"
            />
            <AdminStat
              icon={Package}
              label="Costos del mes"
              value={formatPrice(stats.costsMonth)}
              sub="Mercancía vendida"
              tone="slate"
            />
            <AdminStat
              icon={TrendingUp}
              label="Ganancia"
              value={formatPrice(profit)}
              sub={`Margen ${margin.toFixed(1)}%`}
              tone="emerald"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AdminStat
              icon={ShoppingBag}
              label="Ventas del mes"
              value={monthSales.length}
              sub={`${formatPrice(summaryMonth.totalUSD)} · ${formatCUP(summaryMonth.totalCUP)}`}
              tone="blue"
            />
            <AdminStat
              icon={HandCoins}
              label="Comisiones pendientes"
              value={formatCUP(summaryGlobal.pendingCUP)}
              sub="Por pagar a gestores"
              tone="amber"
            />
            <AdminStat
              icon={Wallet}
              label="Caja actual"
              value={`${formatPrice(cashbox.cash_usd)} · ${formatCUP(cashbox.cash_cup)}`}
              sub="Dinero en caja"
              tone="emerald"
            />
          </div>
        </>
      )}

      {permissions.can_view_finances && (
        <AdminCard>
          <AdminCardTitle icon={HandCoins} title="Ventas registradas (gestores)" />
          {salesTotals.totalCount === 0 ? (
            <AdminEmptyState
              icon={HandCoins}
              title="No hay ventas registradas aún."
              description="Las ventas de los gestores aparecerán aquí."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Ventas totales</div>
                <div className="font-semibold">{salesTotals.totalCount} ventas</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 p-4">
                  <div className="text-xs text-muted-foreground">Total USD</div>
                  <div className="font-display text-2xl font-bold">{formatPrice(salesTotals.totalUSD)}</div>
                </div>
                <div className="rounded-2xl border border-border/60 p-4">
                  <div className="text-xs text-muted-foreground">Total CUP</div>
                  <div className="font-display text-2xl font-bold">{formatCUP(salesTotals.totalCUP)}</div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Por gestor</h3>
                <div className="space-y-2">
                  {salesTotals.bySeller.map((s) => (
                    <div key={s.seller_user_id ?? s.seller_name} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{s.seller_name || "(sin nombre)"}</div>
                        <div className="text-xs text-muted-foreground">{s.count} ventas</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold">{s.totalUSD > 0 ? formatPrice(s.totalUSD) : formatCUP(s.totalCUP)}</div>
                        <div className="text-xs text-muted-foreground">Comisión Pendiente: {formatCUP(s.pendingCommission || 0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </AdminCard>
      )}

      <AdminCard>
        <AdminCardTitle icon={ShoppingBag} title="Pedidos recientes" />
        {recent.length === 0 ? (
          <AdminEmptyState
            icon={ShoppingBag}
            title="No hay pedidos todavía."
            description="Los pedidos nuevos aparecerán aquí en cuanto lleguen."
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <th className={adminTh}>Cliente</th>
                <th className={adminTh}>Teléfono</th>
                <th className={adminTh}>Total</th>
                <th className={adminTh}>Estado</th>
                <th className={adminTh}>Fecha</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className={adminTr}>
                  <td className={`${adminTd} font-medium`}>{o.customer_name}</td>
                  <td className={`${adminTd} text-muted-foreground`}>{o.customer_phone}</td>
                  <td className={`${adminTd} font-bold text-primary`}>
                    {o.payment_currency === "CUP" ? formatCUP(Number(o.total)) : formatPrice(Number(o.total))}
                  </td>
                  <td className={adminTd}>
                    <StatusBadge tone={orderStatusTone(o.status)}>{o.status}</StatusBadge>
                  </td>
                  <td className={`${adminTd} whitespace-nowrap text-xs text-muted-foreground`}>
                    {new Date(o.created_at).toLocaleString("es-CU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <AdminCardTitle
            icon={Globe}
            title="Top páginas (7d)"
            action={rateMissing ? (
              <Button asChild size="sm" variant="secondary" className="min-h-9">
                <a href="/admin" title="Ve a Tasa USD en el panel">Falta tasa USD hoy</a>
              </Button>
            ) : undefined}
          />
          {topPages.length === 0 ? (
            <AdminEmptyState
              icon={Globe}
              title="Aún no hay datos de tráfico."
              description="Las páginas más visitadas de los últimos 7 días aparecerán aquí."
            />
          ) : (
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <th className={adminTh}>Ruta</th>
                  <th className={adminTh}>Visitas</th>
                  <th className={adminTh}>Únicos</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {topPages.map((r) => (
                  <tr key={r.path} className={adminTr}>
                    <td className={`${adminTd} font-medium`}>{r.path}</td>
                    <td className={adminTd}>{r.views}</td>
                    <td className={adminTd}>{r.unique_visitors}</td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          )}
        </AdminCard>

        <AdminCard>
          <AdminCardTitle icon={History} title="Últimas visitas" />
          {recentViews.length === 0 ? (
            <AdminEmptyState
              icon={History}
              title="Aún no hay datos de tráfico."
              description="Las visitas recientes aparecerán aquí."
            />
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {recentViews.map((v) => (
                <div key={`${v.created_at}-${v.visitor_id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-3 transition-colors hover:bg-muted/40">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{v.path}</p>
                    <p className="truncate text-xs text-muted-foreground">{v.visitor_id}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString("es-CU")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}

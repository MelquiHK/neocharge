import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { Package, ShoppingBag, Users, DollarSign, TrendingUp, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function AdminDashboard() {
  const { permissions } = useAuth();
  const [stats, setStats] = useState<Stats>({
    products: 0, lowStock: 0, ordersToday: 0, ordersPending: 0,
    revenueMonth: 0, costsMonth: 0, customers: 0,
    visitsToday: 0, unique7d: 0, visits7d: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
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
        supabase.from("orders").select("total,items").gte("created_at", startMonth),
        supabase.from("orders").select("id").gte("created_at", startDay),
        supabase.from("orders").select("id").eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.rpc("traffic_stats", { days: 7 }),
        supabase.rpc("traffic_top_pages", { days: 7, limit_count: 8 }),
        supabase.rpc("traffic_recent_views", { limit_count: 12 }),
        supabase.from("exchange_rates").select("id").eq("rate_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
      ]);

      const lowStock = (products ?? []).filter((p: any) => p.stock <= (p.low_stock_threshold ?? 5)).length;
      const revenue = (ordersMonth ?? []).reduce((s, o: any) => s + Number(o.total ?? 0), 0);

      // Calcular costos: sumar cost_price * cantidad por cada item
      const costs = (ordersMonth ?? []).reduce((s, o: any) => {
        const items = Array.isArray(o.items) ? o.items : [];
        return s + items.reduce((acc: number, it: any) => {
          const prod = products?.find((p: any) => p.id === it.id || p.id === it.product_id);
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
      setRecent(recentOrders ?? []);
      setTopPages((top.data ?? []) as any);
      setRecentViews((recentV.data ?? []) as any);
      setRateMissing(!todayRate.data);
    };
    load();
  }, []);

  const profit = stats.revenueMonth - stats.costsMonth;
  const margin = stats.revenueMonth > 0 ? (profit / stats.revenueMonth) * 100 : 0;

  const cards = [
    { icon: Package, label: "Productos activos", value: stats.products, color: "text-primary" },
    { icon: AlertTriangle, label: "Stock bajo", value: stats.lowStock, color: "text-warning" },
    { icon: ShoppingBag, label: "Pedidos hoy", value: stats.ordersToday, color: "text-accent" },
    { icon: AlertTriangle, label: "Pedidos pendientes", value: stats.ordersPending, color: "text-destructive" },
    { icon: Users, label: "Clientes registrados", value: stats.customers, color: "text-primary" },
    { icon: Eye, label: "Visitas hoy", value: stats.visitsToday, color: "text-accent" },
    { icon: Eye, label: "Visitantes únicos (7d)", value: stats.unique7d, color: "text-primary" },
    { icon: Eye, label: "Visitas (7d)", value: stats.visits7d, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="card-elevated p-5">
            <c.icon className={`w-5 h-5 mb-3 ${c.color}`} />
            <p className="font-display text-3xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {permissions.can_view_finances && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card-elevated p-5 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <DollarSign className="w-5 h-5 mb-3 text-primary" />
            <p className="text-xs text-muted-foreground">Ingresos del mes</p>
            <p className="font-display text-2xl font-bold">{formatPrice(stats.revenueMonth)}</p>
          </div>
          <div className="card-elevated p-5">
            <Package className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Costos del mes</p>
            <p className="font-display text-2xl font-bold">{formatPrice(stats.costsMonth)}</p>
          </div>
          <div className="card-elevated p-5 bg-gradient-to-br from-success/5 to-transparent border-success/20">
            <TrendingUp className="w-5 h-5 mb-3 text-success" />
            <p className="text-xs text-muted-foreground">Ganancia · Margen {margin.toFixed(1)}%</p>
            <p className="font-display text-2xl font-bold text-success">{formatPrice(profit)}</p>
          </div>
        </div>
      )}

      <section className="card-elevated p-6">
        <h2 className="font-display text-xl font-bold mb-4">Pedidos recientes</h2>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay pedidos todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <th className="py-3 pr-4">Cliente</th>
                  <th className="py-3 pr-4">Teléfono</th>
                  <th className="py-3 pr-4">Total</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium">{o.customer_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{o.customer_phone}</td>
                    <td className="py-3 pr-4 font-bold text-primary">{formatPrice(Number(o.total))}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-xs capitalize">{o.status}</span>
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleString("es-CU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Top páginas (7d)</h2>
            {rateMissing && (
              <Button asChild size="sm" variant="secondary">
                <a href="/admin" title="Ve a Tasa USD en el panel">Falta tasa USD hoy</a>
              </Button>
            )}
          </div>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay datos de tráfico.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4">Ruta</th>
                    <th className="py-2 pr-4">Visitas</th>
                    <th className="py-2">Únicos</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((r) => (
                    <tr key={r.path} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.path}</td>
                      <td className="py-2 pr-4">{r.views}</td>
                      <td className="py-2">{r.unique_visitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card-elevated p-6">
          <h2 className="font-display text-xl font-bold mb-4">Últimas visitas</h2>
          {recentViews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay datos de tráfico.</p>
          ) : (
            <div className="space-y-2">
              {recentViews.map((v) => (
                <div key={`${v.created_at}-${v.visitor_id}`} className="flex items-center justify-between text-sm bg-muted/30 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{v.path}</p>
                    <p className="text-xs text-muted-foreground truncate">{v.visitor_id}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(v.created_at).toLocaleString("es-CU")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

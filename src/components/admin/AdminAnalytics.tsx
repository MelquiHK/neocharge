import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Eye, Globe, Package, Trophy } from "lucide-react";
import {
  AdminCard,
  AdminSectionHeader,
  AdminCardTitle,
  AdminStat,
  AdminEmptyState,
  AdminTable,
  AdminTableHead,
  adminTh,
  adminTd,
  adminTr,
  AdminLoading,
} from "./ui";
import {
  countByReferrer,
  countViewsByDay,
  extractProductSlug,
  topProductsBySales,
  topSlugsByViews,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

const SITE_ORIGIN = "https://tienda-neocharge.vercel.app";

interface ViewRow {
  path: string;
  referrer: string | null;
  created_at: string;
}

interface OrderRow {
  items: unknown;
  status: string;
  created_at: string;
}

function startOfPeriod(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function Bar({ pct, tone = "bg-primary" }: { pct: number; tone?: string }) {
  return (
    <div className="h-2 w-full min-w-[64px] overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

/**
 * Sección "Analytics": qué productos se miran más, de dónde viene la gente
 * y qué se vende más. Los datos salen de `page_views` (la llena TrafficTracker
 * en cada visita) y de `orders`.
 */
export function AdminAnalytics() {
  const [period, setPeriod] = useState<7 | 30>(7);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const start = startOfPeriod(period);
      const [viewsRes, productsRes, ordersRes] = await Promise.all([
        supabase
          .from("page_views")
          .select("path,referrer,created_at")
          .gte("created_at", start)
          .like("path", "/producto/%")
          .order("created_at", { ascending: false })
          .limit(10000),
        supabase.from("products").select("name,slug").eq("is_active", true),
        supabase
          .from("orders")
          .select("items,status,created_at")
          .gte("created_at", start)
          .order("created_at", { ascending: false })
          .limit(5000),
      ]);
      if (viewsRes.error) {
        setError(`No se pudieron leer las visitas: ${viewsRes.error.message}`);
      }
      setViews((viewsRes.data ?? []) as ViewRow[]);
      const names: Record<string, string> = {};
      for (const p of (productsRes.data ?? []) as { name: string; slug: string }[]) {
        names[p.slug] = p.name;
      }
      setProductNames(names);
      setOrders((ordersRes.data ?? []) as OrderRow[]);
      setLoading(false);
    };
    load();
  }, [period]);

  const top = useMemo(() => topSlugsByViews(views, 10), [views]);
  const byDay = useMemo(() => countViewsByDay(views, period), [views, period]);
  const referrers = useMemo(() => countByReferrer(views, SITE_ORIGIN), [views]);
  const sales = useMemo(() => topProductsBySales(orders, 10), [orders]);

  const maxTop = Math.max(1, ...top.map((t) => t.count));
  const maxDay = Math.max(1, ...byDay.map((b) => b.count));
  const totalViews = views.length;
  const uniqueProducts = new Set(views.map((v) => extractProductSlug(v.path)).filter(Boolean)).size;
  const unitsSold = sales.reduce((s, x) => s + x.qty, 0);
  const topReferrer = referrers[0];

  const nameOf = (slug: string) => productNames[slug] ?? slug.replace(/-/g, " ");

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={BarChart3}
        title="Analytics"
        description="Qué miran tus clientes, de dónde vienen y qué se vende más."
        actions={
          <div className="flex rounded-full border border-border/70 bg-card p-1">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                  period === d ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {d} días
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <AdminLoading label="Cargando analytics…" />
      ) : error ? (
        <AdminCard>
          <AdminEmptyState
            icon={BarChart3}
            title="Sin acceso a los datos"
            description={error}
          />
        </AdminCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStat icon={Eye} label="Vistas de productos" value={totalViews.toLocaleString("es-CU")} sub={`Últimos ${period} días`} tone="blue" />
            <AdminStat icon={Package} label="Productos vistos" value={uniqueProducts} sub="Distintos en el periodo" tone="violet" />
            <AdminStat icon={Trophy} label="Unidades vendidas" value={unitsSold.toLocaleString("es-CU")} sub="Pedidos no cancelados" tone="emerald" />
            <AdminStat
              icon={Globe}
              label="Origen principal"
              value={topReferrer ? topReferrer.label : "—"}
              sub={topReferrer ? `${topReferrer.count} visitas` : "Sin datos"}
              tone="amber"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminCard>
              <AdminCardTitle icon={Eye} title="Más vistos" />
              {top.length === 0 ? (
                <AdminEmptyState icon={Eye} title="Sin vistas todavía" description={`Nadie ha abierto fichas de producto en los últimos ${period} días.`} />
              ) : (
                <AdminTable>
                  <AdminTableHead>
                    <tr>
                      <th className={adminTh}>Producto</th>
                      <th className={cn(adminTh, "text-right")}>Vistas</th>
                    </tr>
                  </AdminTableHead>
                  <tbody>
                    {top.map((t, i) => (
                      <tr key={t.slug} className={adminTr}>
                        <td className={adminTd}>
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{nameOf(t.slug)}</p>
                              <Bar pct={(t.count / maxTop) * 100} />
                            </div>
                          </div>
                        </td>
                        <td className={cn(adminTd, "text-right font-display text-base font-bold")}>{t.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              )}
            </AdminCard>

            <AdminCard>
              <AdminCardTitle icon={Trophy} title="Más vendidos" />
              {sales.length === 0 ? (
                <AdminEmptyState icon={Trophy} title="Sin ventas en el periodo" description={`No hay pedidos (sin cancelar) en los últimos ${period} días.`} />
              ) : (
                <AdminTable>
                  <AdminTableHead>
                    <tr>
                      <th className={adminTh}>Producto</th>
                      <th className={cn(adminTh, "text-right")}>Uds.</th>
                      <th className={cn(adminTh, "text-right")}>Ingreso</th>
                    </tr>
                  </AdminTableHead>
                  <tbody>
                    {sales.map((s, i) => (
                      <tr key={s.id} className={adminTr}>
                        <td className={adminTd}>
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {i + 1}
                            </span>
                            <p className="truncate text-sm font-semibold">{s.name}</p>
                          </div>
                        </td>
                        <td className={cn(adminTd, "text-right font-bold")}>{s.qty}</td>
                        <td className={cn(adminTd, "whitespace-nowrap text-right text-sm text-muted-foreground")}>
                          ${s.revenue.toLocaleString("es-CU", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              )}
            </AdminCard>
          </div>

          <AdminCard>
            <AdminCardTitle icon={BarChart3} title={`Vistas por día (últimos ${period} días)`} />
            {totalViews === 0 ? (
              <AdminEmptyState icon={BarChart3} title="Sin datos" description="Todavía no hay vistas registradas en este periodo." />
            ) : (
              <div className="flex h-36 items-end gap-1.5 sm:gap-2">
                {byDay.map((b) => (
                  <div key={b.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${b.date}: ${b.count} vistas`}>
                    <span className="text-[10px] font-bold text-muted-foreground">{b.count > 0 ? b.count : ""}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary/70 to-primary transition-all"
                      style={{ height: `${Math.max(3, (b.count / maxDay) * 100)}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{period === 7 || byDay.length <= 10 ? b.label : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard>
            <AdminCardTitle icon={Globe} title="De dónde viene la gente" />
            {referrers.length === 0 ? (
              <AdminEmptyState icon={Globe} title="Sin datos" description="Todavía no hay visitas registradas en este periodo." />
            ) : (
              <div className="space-y-3">
                {referrers.map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm font-semibold">{r.label}</span>
                    <div className="flex-1">
                      <Bar pct={(r.count / Math.max(1, totalViews)) * 100} tone="bg-sky-500" />
                    </div>
                    <span className="w-16 shrink-0 text-right text-sm font-bold">
                      {r.count}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {Math.round((r.count / Math.max(1, totalViews)) * 100)}%
                      </span>
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  "Directo" = escribió la dirección o vino de WhatsApp/otra app · "Interno" = navegó dentro de la tienda.
                </p>
              </div>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { LineChart, TrendingUp, TriangleAlert } from "lucide-react";
import { AdminCard, AdminCardTitle, AdminEmptyState } from "./ui";
import { avgDailyChange, projectRate, projectedDateLabel, sortedAsc, type RatePoint } from "@/lib/dollar-trend";
import { cn } from "@/lib/utils";

const PROJECTIONS = [7, 14, 30];

function Sparkline({ points }: { points: RatePoint[] }) {
  const W = 320;
  const H = 88;
  const PAD = 8;
  const rates = points.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = Math.max(1, max - min);
  const xy = points.map((p, i) => {
    const x = PAD + (i / Math.max(1, points.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (p.rate - min) / span) * (H - PAD * 2);
    return { x, y };
  });
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1].x.toFixed(1)},${H} L${xy[0].x.toFixed(1)},${H} Z`;
  const gid = "nc-dollar-trend";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label="Historial de la tasa">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(222 89% 55%)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(222 89% 55%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="hsl(222 89% 55%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1].x} cy={xy[xy.length - 1].y} r="4" fill="hsl(222 89% 55%)" stroke="white" strokeWidth="2" />
    </svg>
  );
}

/**
 * Panel "Tendencia del dólar": mini-gráfico del historial de `exchange_rates`,
 * subida promedio diaria (7/30 días) y proyección lineal simple.
 */
export function DollarTrend({ rates }: { rates: { rate_date: string; usd_to_cup: number }[] }) {
  const points = useMemo<RatePoint[]>(
    () => sortedAsc(rates.map((r) => ({ date: r.rate_date, rate: Number(r.usd_to_cup) }))).slice(-60),
    [rates]
  );

  const stats = useMemo(() => {
    if (points.length < 2) return null;
    const last = points[points.length - 1];
    const avg7 = avgDailyChange(points, 7);
    const avg30 = avgDailyChange(points, 30);
    const projections = PROJECTIONS.map((d) => ({
      days: d,
      label: projectedDateLabel(new Date(), d),
      rate: avg7 == null ? null : Math.round(projectRate(last.rate, avg7, d)),
    }));
    return { last, avg7, avg30, projections };
  }, [points]);

  if (!stats) {
    return (
      <AdminCard>
        <AdminCardTitle icon={LineChart} title="Tendencia del dólar" />
        <AdminEmptyState
          icon={LineChart}
          title="Sin datos suficientes"
          description="Guarda la tasa un par de días seguidos y aquí verás la tendencia."
        />
      </AdminCard>
    );
  }

  const fmtAvg = (v: number | null) =>
    v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)} CUP/día`;

  return (
    <AdminCard className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <AdminCardTitle icon={LineChart} title="Tendencia del dólar" />

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historial</p>
          <p className="text-xs text-muted-foreground">
            {points[0].date} → {stats.last.date} · <span className="font-bold text-foreground">1 USD = {stats.last.rate} CUP</span>
          </p>
        </div>
        <Sparkline points={points} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Subida prom. (7 días)
          </p>
          <p className={cn("mt-1 font-display text-xl font-bold", (stats.avg7 ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {fmtAvg(stats.avg7)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Subida prom. (30 días)
          </p>
          <p className={cn("mt-1 font-display text-xl font-bold", (stats.avg30 ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {fmtAvg(stats.avg30)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Proyección (promedio de 7 días)
        </p>
        <div className="grid grid-cols-3 gap-3">
          {stats.projections.map((p) => (
            <div key={p.days} className="rounded-2xl border border-primary/25 bg-primary/5 p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                +{p.days} días <span className="normal-case">({p.label})</span>
              </p>
              <p className="mt-1 font-display text-lg font-bold text-primary">
                ≈ {p.rate == null ? "—" : `${p.rate} CUP`}
              </p>
            </div>
          ))}
        </div>
        <p className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Esto es una proyección matemática con el ritmo de los últimos 7 días, no una predicción.
          La tasa real la publica elTOQUE cada mañana y puede subir, bajar o quedarse igual.
        </p>
      </div>
    </AdminCard>
  );
}

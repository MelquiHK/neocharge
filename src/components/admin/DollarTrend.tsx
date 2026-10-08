import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  Activity,
  Briefcase,
  LineChart,
  Minus,
  Rocket,
  Snail,
  Target,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";
import { AdminCard, AdminCardTitle, AdminEmptyState } from "./ui";
import { supabase } from "@/integrations/supabase/client";
import {
  avgDailyChange,
  chargerImpact,
  momentum,
  projectMultiModel,
  scenarioDate,
  sortedAsc,
  volatility,
  weightedAvgDailyChange,
  type ChargerPrice,
  type RatePoint,
} from "@/lib/dollar-trend";
import { cn } from "@/lib/utils";

export interface DollarRateRow {
  rate_date: string;
  usd_to_cup: number;
  extra_cup_chargers?: number | null;
}

const PROJECTIONS = [7, 14, 30];
const SCENARIO_PACES = [3, 5, 10];
const SCENARIO_TARGETS = [800, 850, 900];

/** Precios reales de Mel (fallback si no se puede leer la BD). */
const FALLBACK_CHARGERS: ChargerPrice[] = [
  { name: "Cargador 72V/10A", usd: 150 },
  { name: "Cargador 72V/7A", usd: 110 },
  { name: "Cargador 72V/5A", usd: 60 },
  { name: "Cargador 72V/3A", usd: 45 },
  { name: "Cargador 48V/5A", usd: 55 },
  { name: "Cargador 48V/3A", usd: 45 },
];

const numFmt = new Intl.NumberFormat("es-CU");

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
  const gid = "nc-dollar-intel";
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

function StatCard({
  icon: Icon,
  label,
  value,
  valueClass,
  sub,
}: {
  icon: ElementType;
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </p>
      <p className={cn("mt-1 font-display text-xl font-bold", valueClass ?? "text-foreground")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const MOMENTUM_META = {
  acelerando: { icon: Rocket, text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", desc: "La subida se está acelerando: el ritmo de los últimos 7 días supera al de los 7 anteriores." },
  estable: { icon: Minus, text: " text-brand-600 dark:text-brand-400", bg: " bg-brand-500/10 border-brand-500/30", desc: "Ritmo estable: la subida de los últimos 7 días va pareja con la de los 7 anteriores." },
  frenando: { icon: Snail, text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", desc: "La subida se está frenando: el ritmo de los últimos 7 días es menor que el de los 7 anteriores." },
} as const;

const VOLATILITY_META = {
  tranquilo: { icon: Minus, text: "text-emerald-600 dark:text-emerald-400", desc: "Cambios diarios parejos, sin sobresaltos." },
  normal: { icon: Activity, text: "text-amber-600 dark:text-amber-400", desc: "Movimiento habitual del mercado informal." },
  nervioso: { icon: Activity, text: "text-rose-600 dark:text-rose-400", desc: "Cambios diarios muy dispares: el mercado está nervioso." },
} as const;

/**
 * Centro de inteligencia del dólar: historial real de `exchange_rates`,
 * proyección multi-modelo con rangos, momentum, volatilidad, escenarios
 * e impacto en los precios de los cargadores.
 */
export function DollarTrend({ rates }: { rates: DollarRateRow[] }) {
  const [chargers, setChargers] = useState<ChargerPrice[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("name,price")
          .eq("is_active", true)
          .eq("warranty_type", "charger")
          .order("price", { ascending: false });
        if (error) throw error;
        if (alive) setChargers((data ?? []) as ChargerPrice[]);
      } catch {
        if (alive) setChargers(FALLBACK_CHARGERS);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const points = useMemo<RatePoint[]>(
    () => sortedAsc(rates.map((r) => ({ date: r.rate_date, rate: Number(r.usd_to_cup) }))).slice(-90),
    [rates]
  );

  const intel = useMemo(() => {
    if (points.length < 2) return null;
    const now = new Date();
    const last = points[points.length - 1];
    const extra = Number(rates.find((r) => r.rate_date === last.date)?.extra_cup_chargers ?? 0);

    const avg7 = avgDailyChange(points, 7, now);
    const avg30 = avgDailyChange(points, 30, now);
    const weighted = weightedAvgDailyChange(points, 30, now);
    const models = [
      { name: "Prom. 7 días", avgDaily: avg7 ?? NaN },
      { name: "Prom. 30 días", avgDaily: avg30 ?? NaN },
      { name: "Ponderado", avgDaily: weighted ?? NaN },
    ];

    const projections = PROJECTIONS.map((d) => projectMultiModel(last.rate, models, d, now)).filter(
      (p): p is NonNullable<typeof p> => p != null
    );

    const mom = momentum(points, now);
    const vol = volatility(points, 30, now);

    const effNow = last.rate + extra;
    const p7 = projections.find((p) => p.days === 7);
    const p14 = projections.find((p) => p.days === 14);
    const impact = chargerImpact(
      chargers ?? FALLBACK_CHARGERS,
      effNow,
      p7 ? { min: p7.min + extra, max: p7.max + extra } : { min: effNow, max: effNow },
      p14 ? { min: p14.min + extra, max: p14.max + extra } : { min: effNow, max: effNow }
    );

    return { last, extra, avg7, avg30, weighted, projections, mom, vol, impact };
  }, [points, rates, chargers]);

  if (!intel) {
    return (
      <AdminCard>
        <AdminCardTitle icon={LineChart} title="Inteligencia del dólar" />
        <AdminEmptyState
          icon={LineChart}
          title="Sin datos suficientes"
          description="Guarda la tasa un par de días seguidos y aquí verás la tendencia."
        />
      </AdminCard>
    );
  }

  const { last, avg7, avg30, weighted, projections, mom, vol, impact } = intel;
  const fmtAvg = (v: number | null) =>
    v == null || !Number.isFinite(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)} CUP/día`;

  return (
    <AdminCard className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <AdminCardTitle icon={LineChart} title="Inteligencia del dólar" />

      {/* Tasa actual + historial */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Historial · {points[0].date} → {last.date}
          </p>
          <p className="font-display text-2xl font-bold text-primary">
            1 USD = {numFmt.format(last.rate)} CUP
          </p>
        </div>
        <Sparkline points={points} />
      </div>

      {/* Promedios */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={TrendingUp} label="Subida prom. (7 días)" value={fmtAvg(avg7)}
          valueClass={(avg7 ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
        <StatCard icon={TrendingUp} label="Subida prom. (30 días)" value={fmtAvg(avg30)}
          valueClass={(avg30 ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
        <StatCard icon={TrendingUp} label="Ponderado (reciente pesa más)" value={fmtAvg(weighted)}
          valueClass={(weighted ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
      </div>

      {/* Momentum + volatilidad */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn("rounded-2xl border p-4", mom ? MOMENTUM_META[mom.label].bg : "border-border/60 bg-card")}>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Momentum
          </p>
          {mom ? (
            <>
              <p className={cn("mt-1 flex items-center gap-2 font-display text-xl font-bold capitalize", MOMENTUM_META[mom.label].text)}>
                {(() => {
                  const Icon = MOMENTUM_META[mom.label].icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                {mom.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {mom.recentAvg.toFixed(1)} vs {mom.prevAvg.toFixed(1)} CUP/día (últ. 7 días vs 7 anteriores)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{MOMENTUM_META[mom.label].desc}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Se necesitan al menos 14 días de historial.</p>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" /> Volatilidad
          </p>
          {vol ? (
            <>
              <p className={cn("mt-1 flex items-center gap-2 font-display text-xl font-bold capitalize", VOLATILITY_META[vol.label].text)}>
                {(() => {
                  const Icon = VOLATILITY_META[vol.label].icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                {vol.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Desviación de ±{vol.std.toFixed(1)} CUP en los cambios diarios (30 días)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{VOLATILITY_META[vol.label].desc}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Se necesitan más días de historial.</p>
          )}
        </div>
      </div>

      {/* Proyección multi-modelo */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Proyección multi-modelo <span className="font-medium normal-case">(rango entre los 3 modelos)</span>
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-bold">Horizonte</th>
                <th className="px-3 py-2 text-right font-bold">Prom. 7 días</th>
                <th className="px-3 py-2 text-right font-bold">Prom. 30 días</th>
                <th className="px-3 py-2 text-right font-bold">Ponderado</th>
                <th className="px-3 py-2 text-right font-bold">Rango</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => (
                <tr key={p.days} className="border-t border-border/40">
                  <td className="px-3 py-2 font-semibold">
                    +{p.days} días <span className="font-normal text-muted-foreground">({p.label})</span>
                  </td>
                  {p.models.map((m) => (
                    <td key={m.name} className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {numFmt.format(m.rate)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold tabular-nums text-primary">
                    {numFmt.format(p.min)} – {numFmt.format(p.max)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Escenarios */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Target className="h-3.5 w-3.5 text-primary" /> Escenarios: ¿cuándo llegaría a…?
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[380px] text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-bold">Si sube…</th>
                {SCENARIO_TARGETS.map((t) => (
                  <th key={t} className="px-3 py-2 text-right font-bold">{numFmt.format(t)} CUP</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCENARIO_PACES.map((pace) => (
                <tr key={pace} className="border-t border-border/40">
                  <td className="px-3 py-2 font-semibold">+{pace}/día</td>
                  {SCENARIO_TARGETS.map((t) => {
                    const cell = scenarioDate(last.rate, pace, t);
                    return (
                      <td key={t} className="px-3 py-2 text-right tabular-nums">
                        {cell.reached ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">ya</span>
                        ) : (
                          <span>
                            {cell.date}
                            <span className="ml-1 text-xs text-muted-foreground">({cell.days}d)</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">A ritmo constante desde la tasa actual ({numFmt.format(last.rate)} CUP).</p>
      </div>

      {/* Impacto en el negocio */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5 text-primary" /> Impacto en el negocio: cargadores en CUP
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-bold">Cargador</th>
                <th className="px-3 py-2 text-right font-bold">USD</th>
                <th className="px-3 py-2 text-right font-bold">Hoy</th>
                <th className="px-3 py-2 text-right font-bold">+7 días</th>
                <th className="px-3 py-2 text-right font-bold">+14 días</th>
              </tr>
            </thead>
            <tbody>
              {impact.map((row) => (
                <tr key={row.name} className="border-t border-border/40">
                  <td className="px-3 py-2 font-semibold">{row.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">${row.usd}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{numFmt.format(row.cupNow)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {numFmt.format(row.cup7min)} – {numFmt.format(row.cup7max)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {numFmt.format(row.cup14min)} – {numFmt.format(row.cup14max)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Conversión con tasa efectiva de cargadores (tasa + extra). Los rangos usan el punto medio entre modelos.
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        Proyección matemática basada en el historial real, no una predicción: la tasa real la publica
        elTOQUE cada mañana y puede subir, bajar o quedarse igual según noticias y el mercado.
      </p>
    </AdminCard>
  );
}

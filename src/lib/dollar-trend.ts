/**
 * Matemáticas de la "Tendencia del dólar".
 *
 * Fuente de datos: tabla `exchange_rates` (rate_date, usd_to_cup), que ya
 * guarda una fila por día cada vez que se actualiza la tasa en el admin.
 * Todo puro y testeable.
 */

export interface RatePoint {
  date: string; // YYYY-MM-DD
  rate: number;
}

function parseDay(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Ordena puntos por fecha ascendente, descartando fechas inválidas. */
export function sortedAsc(points: RatePoint[]): RatePoint[] {
  return points
    .filter((p) => parseDay(p.date) && Number.isFinite(p.rate))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Subida promedio diaria (CUP/día) en la ventana de los últimos `windowDays`
 * días. Se calcula como (última - primera) / días calendario entre ambas,
 * así los huecos sin registro no distorsionan. Null si hay menos de 2 puntos.
 */
export function avgDailyChange(
  points: RatePoint[],
  windowDays: number,
  now: Date = new Date()
): number | null {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffKey = dayKey(cutoff);
  const inWindow = sortedAsc(points).filter((p) => p.date >= cutoffKey);
  if (inWindow.length < 2) return null;
  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  const firstD = parseDay(first.date)!;
  const lastD = parseDay(last.date)!;
  const daysBetween = Math.max(
    1,
    Math.round((lastD.getTime() - firstD.getTime()) / 86_400_000)
  );
  return (last.rate - first.rate) / daysBetween;
}

/** Proyección lineal simple: última tasa + promedio diario × días. */
function projectRate(lastRate: number, avgDaily: number, daysAhead: number): number {
  return lastRate + avgDaily * daysAhead;
}

/** Fecha proyectada en formato corto D/M. */
function projectedDateLabel(now: Date, daysAhead: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Fecha proyectada en formato D/M/AAAA (para escenarios lejanos). */
function projectedDateFull(now: Date, daysAhead: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Cambio por día calendario entre dos registros consecutivos. */
interface DailyChange {
  date: string; // fecha del registro más reciente (YYYY-MM-DD)
  change: number; // CUP/día
}

/**
 * Serie de cambios diarios a partir de puntos consecutivos.
 * Normaliza por los días calendario entre registros, así los huecos
 * sin registro no distorsionan. Vacío si hay menos de 2 puntos.
 */
function dailyChanges(points: RatePoint[]): DailyChange[] {
  const s = sortedAsc(points);
  const out: DailyChange[] = [];
  for (let i = 1; i < s.length; i++) {
    const prev = parseDay(s[i - 1].date)!;
    const cur = parseDay(s[i].date)!;
    const gapDays = Math.max(
      1,
      Math.round((cur.getTime() - prev.getTime()) / 86_400_000)
    );
    out.push({ date: s[i].date, change: (s[i].rate - s[i - 1].rate) / gapDays });
  }
  return out;
}

/**
 * Promedio ponderado de subida diaria: los cambios más recientes pesan más
 * (pesos lineales 1..n, n = el más reciente). Null si no hay cambios en la ventana.
 */
export function weightedAvgDailyChange(
  points: RatePoint[],
  windowDays = 30,
  now: Date = new Date()
): number | null {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffKey = dayKey(cutoff);
  const changes = dailyChanges(points).filter((c) => c.date >= cutoffKey);
  if (changes.length === 0) return null;
  let num = 0;
  let den = 0;
  changes.forEach((c, i) => {
    const w = i + 1; // el más reciente pesa más
    num += w * c.change;
    den += w;
  });
  return num / den;
}

export interface ModelAvg {
  name: string;
  avgDaily: number;
}

export interface ModelProjection {
  days: number;
  label: string;
  models: { name: string; rate: number }[];
  min: number;
  max: number;
  mid: number;
}

/**
 * Proyección multi-modelo: cada modelo proyecta por su cuenta y se devuelve
 * el rango (mín–máx) entre modelos, no un solo número. Null si ningún modelo
 * tiene datos.
 */
export function projectMultiModel(
  lastRate: number,
  models: ModelAvg[],
  daysAhead: number,
  now: Date = new Date()
): ModelProjection | null {
  const valid = models.filter((m) => Number.isFinite(m.avgDaily));
  if (valid.length === 0) return null;
  const projected = valid.map((m) => ({
    name: m.name,
    rate: Math.round(projectRate(lastRate, m.avgDaily, daysAhead)),
  }));
  const rates = projected.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  return {
    days: daysAhead,
    label: projectedDateLabel(now, daysAhead),
    models: projected,
    min,
    max,
    mid: Math.round((min + max) / 2),
  };
}

export type MomentumLabel = "acelerando" | "estable" | "frenando";

export interface Momentum {
  label: MomentumLabel;
  recentAvg: number; // prom. últimos 7 días
  prevAvg: number; // prom. 7 días anteriores
}

/**
 * Momentum: compara el promedio de subida de los últimos 7 días contra
 * los 7 anteriores. Umbral de ±1.5 CUP/día para declarar cambio de ritmo.
 */
export function momentum(
  points: RatePoint[],
  now: Date = new Date()
): Momentum | null {
  const cutoff7 = new Date(now);
  cutoff7.setDate(cutoff7.getDate() - 7);
  const cutoff14 = new Date(now);
  cutoff14.setDate(cutoff14.getDate() - 14);
  const k7 = dayKey(cutoff7);
  const k14 = dayKey(cutoff14);
  const changes = dailyChanges(points);
  const recent = changes.filter((c) => c.date > k7).map((c) => c.change);
  const prev = changes.filter((c) => c.date > k14 && c.date <= k7).map((c) => c.change);
  if (recent.length === 0 || prev.length === 0) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recentAvg = avg(recent);
  const prevAvg = avg(prev);
  const delta = recentAvg - prevAvg;
  const label: MomentumLabel = delta > 1.5 ? "acelerando" : delta < -1.5 ? "frenando" : "estable";
  return { label, recentAvg, prevAvg };
}

export type VolatilityLabel = "tranquilo" | "normal" | "nervioso";

export interface Volatility {
  std: number; // desviación estándar de los cambios diarios (CUP)
  label: VolatilityLabel;
}

/**
 * Volatilidad: desviación estándar poblacional de los cambios diarios en la
 * ventana. Mercado tranquilo < 2, normal < 5, nervioso ≥ 5 CUP de dispersión.
 */
export function volatility(
  points: RatePoint[],
  windowDays = 30,
  now: Date = new Date()
): Volatility | null {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffKey = dayKey(cutoff);
  const xs = dailyChanges(points)
    .filter((c) => c.date >= cutoffKey)
    .map((c) => c.change);
  if (xs.length < 2) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  const std = Math.sqrt(variance);
  const label: VolatilityLabel = std < 2 ? "tranquilo" : std < 5 ? "normal" : "nervioso";
  return { std, label };
}

export interface ScenarioCell {
  /** Días para llegar al objetivo a ritmo constante (0 = ya se alcanzó). */
  days: number;
  reached: boolean;
  date: string; // D/M/AAAA o "ya"
}

/**
 * ¿En qué fecha se llegaría a `target` CUP manteniendo un ritmo constante
 * de `pace` CUP/día? Si el objetivo ya se alcanzó, days = 0.
 */
export function scenarioDate(
  lastRate: number,
  pace: number,
  target: number,
  now: Date = new Date()
): ScenarioCell {
  if (target <= lastRate || pace <= 0) {
    return { days: 0, reached: true, date: "ya" };
  }
  const days = Math.ceil((target - lastRate) / pace);
  return { days, reached: false, date: projectedDateFull(now, days) };
}

export interface ChargerPrice {
  name: string;
  usd: number;
}

export interface ChargerImpactRow extends ChargerPrice {
  cupNow: number;
  cup7min: number;
  cup7max: number;
  cup14min: number;
  cup14max: number;
}

/**
 * Impacto en el negocio: convierte cada precio USD a CUP con la tasa efectiva
 * actual (tasa + extra de cargadores) y con los rangos proyectados a +7/+14 días.
 * Las tasas efectivas ya incluyen el extra; aquí solo se multiplica.
 */
export function chargerImpact(
  chargers: ChargerPrice[],
  effNow: number,
  range7: { min: number; max: number },
  range14: { min: number; max: number }
): ChargerImpactRow[] {
  return chargers.map((c) => ({
    ...c,
    cupNow: Math.round(c.usd * effNow),
    cup7min: Math.round(c.usd * range7.min),
    cup7max: Math.round(c.usd * range7.max),
    cup14min: Math.round(c.usd * range14.min),
    cup14max: Math.round(c.usd * range14.max),
  }));
}

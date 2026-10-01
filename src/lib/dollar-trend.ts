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
export function projectRate(lastRate: number, avgDaily: number, daysAhead: number): number {
  return lastRate + avgDaily * daysAhead;
}

/** Fecha proyectada en formato corto D/M. */
export function projectedDateLabel(now: Date, daysAhead: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

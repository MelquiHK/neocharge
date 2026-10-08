/**
 * Fechas en la zona horaria de Cuba (America/Havana).
 * El servidor corre en UTC: usar `new Date().toISOString()` para "hoy"
 * falla de 8pm a 12am hora de Cuba (ya es "mañana" en UTC).
 */

/** Offset (UTC - reloj de La Habana) en ms para un instante dado. */
function havanaOffsetAt(ts: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Havana",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  // El reloj habanero interpretado como si fuera UTC...
  const wallAsUTC = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")) % 24,
    Number(get("minute")),
    Number(get("second")),
  );
  // ...menos el instante real = -offset (ej. -4h en horario de verano).
  return wallAsUTC - ts;
}

/** "YYYY-MM-DD" del día actual en La Habana. */
export function havanaDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** ISO UTC de la medianoche habanera del día dado. */
export function startOfHavanaDayISO(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "1");
  const midnightUTC = Date.UTC(get("year"), get("month") - 1, get("day"), 0, 0, 0);
  // Probar con el offset del mediodía (evita bordes de cambio de hora).
  const offset = havanaOffsetAt(midnightUTC + 12 * 3600 * 1000);
  return new Date(midnightUTC - offset).toISOString();
}

/** ISO UTC del primer instante del mes habanero dado. */
export function startOfHavanaMonthISO(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "1");
  const midnightUTC = Date.UTC(get("year"), get("month") - 1, 1, 0, 0, 0);
  const offset = havanaOffsetAt(midnightUTC + 12 * 3600 * 1000);
  return new Date(midnightUTC - offset).toISOString();
}

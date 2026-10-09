/**
 * Calidad de la conexión, con honestidad hacia el usuario.
 *
 * - "online": internet normal.
 * - "degraded": conexión lenta o con ahorro de datos. La app prefiere
 *   mostrar los datos guardados y evita descargas pesadas.
 * - "offline": sin internet. Todo se sirve del almacén local.
 *
 * Combina `navigator.onLine`, la Network Information API (effectiveType)
 * y una medición real de latencia cuando hace falta.
 */

export type ConnectionQuality = "online" | "degraded" | "offline";

interface NetworkInformationLike {
  effectiveType?: string;
  saveData?: boolean;
}

/** Clasificación pura (testeable): a partir de señales, decide el estado. */
export function classifyConnection(signals: {
  onLine: boolean;
  effectiveType?: string;
  saveData?: boolean;
  latencyMs?: number;
}): ConnectionQuality {
  if (!signals.onLine) return "offline";
  const slowTypes = new Set(["slow-2g", "2g"]);
  if (signals.effectiveType && slowTypes.has(signals.effectiveType)) return "degraded";
  if (signals.saveData) return "degraded";
  // Más de 6s para una petición mínima = red inutilizable en la práctica.
  if (signals.latencyMs != null && signals.latencyMs > 6000) return "degraded";
  return "online";
}

function readNetworkInfo(): NetworkInformationLike {
  try {
    const nav = navigator as Navigator & {
      connection?: NetworkInformationLike;
      mozConnection?: NetworkInformationLike;
      webkitConnection?: NetworkInformationLike;
    };
    return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? {};
  } catch {
    return {};
  }
}

/** Medición ligera de latencia: un HEAD al origen con timeout corto. */
async function probeLatency(timeoutMs = 4000): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const start = performance.now();
    await fetch(window.location.origin, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    return performance.now() - start;
  } catch {
    return null;
  }
}

/**
 * Evalúa la conexión actual. Si `probe` es true, mide la latencia real
 * (útil cuando navigator.onLine dice que sí pero nada carga).
 */
export async function getConnectionQuality(probe = false): Promise<ConnectionQuality> {
  const onLine = typeof navigator === "undefined" ? true : navigator.onLine;
  if (!onLine) return "offline";
  const info = readNetworkInfo();
  const latencyMs = probe ? await probeLatency() : undefined;
  // Si el probe falló del todo con onLine=true, la red no sirve.
  if (probe && latencyMs == null) return "offline";
  return classifyConnection({
    onLine,
    effectiveType: info.effectiveType,
    saveData: info.saveData,
    latencyMs: latencyMs ?? undefined,
  });
}

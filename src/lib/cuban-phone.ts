// Normalización y validación de teléfonos móviles cubanos para WhatsApp.
// El bot de NeoCharge espera el formato 53XXXXXXXX (53 + 8 dígitos del móvil).

/**
 * Normaliza un número cubano al formato 53XXXXXXXX.
 * Acepta: "58427265", "63180910", "53 5842 7265", "+53 58427265", "5358427265".
 * Devuelve null si no es un móvil cubano válido (5 o 6 + 7 dígitos).
 * Nota: los móviles cubanos pueden empezar con 5 (series clásicas) o con 6
 * (series nuevas de ETECSA, ej. 63xx xxxx).
 */
export function normalizeCubanPhone(input: string): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  let n = digits;
  // Móvil de 8 dígitos sin prefijo -> anteponer 53
  if (/^[56]\d{7}$/.test(n)) n = "53" + n;
  // Debe quedar 53 + móvil cubano (5 o 6 + 7 dígitos)
  if (/^53[56]\d{7}$/.test(n)) return n;
  return null;
}

/** Formato legible: 5358427265 -> "+53 5842 7265". */
export function formatCubanPhoneDisplay(normalized: string): string {
  const d = String(normalized ?? "").replace(/\D/g, "");
  if (/^53[56]\d{7}$/.test(d)) return `+53 ${d.slice(2, 6)} ${d.slice(6)}`;
  return normalized;
}

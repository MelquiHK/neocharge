// Normalización y validación de teléfonos móviles cubanos para WhatsApp.
// El bot de NeoCharge espera el formato 53XXXXXXXX (53 + 8 dígitos del móvil).

/**
 * Normaliza un número cubano al formato 53XXXXXXXX.
 * Acepta: "58427265", "53 5842 7265", "+53 58427265", "5358427265".
 * Devuelve null si no es un móvil cubano válido (5 + 7 dígitos).
 */
export function normalizeCubanPhone(input: string): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  let n = digits;
  // Móvil de 8 dígitos sin prefijo -> anteponer 53
  if (/^5\d{7}$/.test(n)) n = "53" + n;
  // Debe quedar 53 + móvil cubano (5 + 7 dígitos)
  if (/^535\d{7}$/.test(n)) return n;
  return null;
}

/** Formato legible: 5358427265 -> "+53 5842 7265". */
export function formatCubanPhoneDisplay(normalized: string): string {
  const d = String(normalized ?? "").replace(/\D/g, "");
  if (/^535\d{7}$/.test(d)) return `+53 ${d.slice(2, 6)} ${d.slice(6)}`;
  return normalized;
}

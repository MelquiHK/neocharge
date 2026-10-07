/**
 * Funciones puras para ventas surtidas por socios.
 * Sin dependencias de Supabase ni React: solo matemáticas y normalización.
 */

/** Normaliza un valor arbitrario a la moneda soportada ("CUP" o "USD"). */
export function normalizePartnerCurrency(value: unknown): "USD" | "CUP" {
  return String(value).toUpperCase() === "CUP" ? "CUP" : "USD";
}

/**
 * Stock propio efectivo de un producto.
 * - Si hay stock propio confirmado (> 0), se usa.
 * - Si no, y el producto aún no está configurado en el sistema de socios,
 *   se usa el stock legado (transición) si es positivo.
 * - En cualquier otro caso, 0.
 * Las entradas negativas se tratan como 0.
 */
export function effectiveOwnStock(ownStock: number, legacyStock: number, isConfigured: boolean): number {
  const own = Math.max(0, ownStock);
  if (own > 0) return own;
  const legacy = Math.max(0, legacyStock);
  if (!isConfigured && legacy > 0) return legacy;
  return 0;
}

/**
 * Convierte un monto a USD.
 * - Moneda USD: devuelve el monto tal cual.
 * - Moneda CUP con tasa válida (> 0): monto / tasa.
 * - Sin tasa válida: NaN.
 */
export function toUsd(amount: number, currency: string, usdToCupRate: number | null): number {
  if (normalizePartnerCurrency(currency) === "USD") return amount;
  return usdToCupRate != null && usdToCupRate > 0 ? amount / usdToCupRate : NaN;
}

/**
 * Margen de Mel en USD para una venta surtida por socio:
 * precio de venta en USD menos precio del socio en USD.
 * Devuelve NaN si alguno de los dos no se puede convertir (sin tasa, etc.).
 */
export function partnerMarginUsd(
  salePrice: number,
  saleCurrency: string,
  partnerPrice: number,
  partnerCurrency: string,
  usdToCupRate: number | null,
): number {
  const saleUsd = toUsd(salePrice, saleCurrency, usdToCupRate);
  const partnerUsd = toUsd(partnerPrice, partnerCurrency, usdToCupRate);
  if (Number.isNaN(saleUsd) || Number.isNaN(partnerUsd)) return NaN;
  return saleUsd - partnerUsd;
}

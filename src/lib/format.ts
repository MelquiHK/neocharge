import type { ExchangeRate } from "@/hooks/use-exchange-rate";

export function formatPrice(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-CU", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCUP(value: number) {
  return `${new Intl.NumberFormat("es-CU", { maximumFractionDigits: 0 }).format(Math.round(value))} CUP`;
}

/**
 * Formatea un monto en la moneda del producto.
 * NOTA: `formatPrice` (Intl es-CU, USD, narrowSymbol) ya incluye el símbolo
 * "$" en la propia cadena ("$55.00"). Nunca se debe anteponer ni posponer otro
 * indicador de moneda (p. ej. "US$ " + formatPrice(x) o formatPrice(x) + " USD"),
 * porque eso produce el doble símbolo. Usa esta función cuando la moneda
 * puede variar por producto.
 */
export function formatMoney(value: number, currency?: string | null) {
  return (currency ?? "USD").toUpperCase() === "CUP" ? formatCUP(value) : formatPrice(value);
}

/**
 * ¿Es razonable mostrar el compare_price como "precio anterior"?
 * Se oculta cuando el descuento implicado es absurdo (>90%) o incoherente
 * (compare_price menor o igual al precio). Así un dato mal cargado en el
 * panel no se convierte en un "-97%" imposible en la tienda.
 */
export function hasSaneDiscount(price: number, comparePrice: number | null | undefined): boolean {
  const p = Number(price);
  const c = Number(comparePrice);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= 0 || p < 0) return false;
  if (c <= p) return false;
  const discountPct = ((c - p) / c) * 100;
  return discountPct <= 90;
}

/**
 * Etiqueta legible en español para los valores de `warranty_type` de la
 * tabla products. Nunca se muestra el valor crudo al cliente.
 */
export function warrantyTypeLabel(warrantyType: string | null | undefined): string {
  switch ((warrantyType ?? "").toLowerCase()) {
    case "charger":
      return "Garantía del cargador";
    case "electronics":
      return "Garantía de electrónica";
    default:
      return "Garantía incluida";
  }
}

/**
 * Nombres de categorías corregidos para mostrar al cliente.
 * La tabla `categories` trae tildes y capitalización inconsistentes
 * ("Cargador 48v", "Audifonos", "Energia Casa"); se normaliza aquí sin
 * tocar los datos.
 */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "cargadores 72v": "Cargadores 72V",
  "cargador 48v": "Cargador 48V",
  "audio": "Audio",
  "piezas": "Piezas",
  "accesorios": "Accesorios",
  "audifonos": "Audífonos",
  "energia casa": "Energía para el hogar",
};

export function displayCategoryName(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  return CATEGORY_DISPLAY_NAMES[raw.toLowerCase()] ?? raw;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface PriceableProduct {
  price: number;
  currency?: string | null;
  price_cup?: number | null;
  extra_cup_per_usd?: number | null;
  warranty_type?: string | null;
}

/**
 * Precio de visualización en USD y/o CUP según la tasa actual.
 * - Si el producto está en USD: muestra USD y conversión a CUP usando tasa (+ extra si es cargador).
 * - Si el producto está en CUP: muestra CUP fijo (price_cup o price).
 *
 * IMPORTANTE: si no hay tasa (rate === null), NO se inventa ninguna conversión.
 * Los valores convertidos quedan en `null` y quien renderiza debe mostrar "—"
 * u omitir esa parte, nunca un número calculado con tasa 1.
 */
export type DisplayPrice = { usd: number | null; cup: number | null; primary: "USD" | "CUP" };

export function computeDisplayPrice(product: PriceableProduct, rate: ExchangeRate | null): DisplayPrice {
  const currency = (product.currency ?? "USD").toUpperCase();
  const isCharger = product.warranty_type === "charger";

  if (!rate) {
    if (currency === "CUP") {
      const cup = Number(product.price_cup ?? product.price);
      return { usd: null, cup, primary: "CUP" as const };
    }
    const usd = Number(product.price || 0);
    return { usd, cup: null, primary: "USD" as const };
  }

  const actualRate = Number(rate.usd_to_cup);
  const actualExtraCupChargers = isCharger ? Number(rate.extra_cup_chargers) : 0;
  const extraPerUsd = Number(product.extra_cup_per_usd ?? 0) || actualExtraCupChargers;

  if (currency === "CUP") {
    const cup = Number(product.price_cup ?? product.price);
    const usd = cup / actualRate;
    return { usd, cup, primary: "CUP" as const };
  }

  // USD
  const usd = Number(product.price || 0);
  const cup = usd * (actualRate + extraPerUsd);
  return { usd, cup, primary: "USD" as const };
}

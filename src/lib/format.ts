import type { ExchangeRate } from "@/hooks/use-exchange-rate";

export function formatPrice(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-CU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCUP(value: number) {
  return `${new Intl.NumberFormat("es-CU", { maximumFractionDigits: 0 }).format(Math.round(value))} CUP`;
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

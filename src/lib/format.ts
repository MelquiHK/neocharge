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
 * Calcula el precio de visualización en USD y/o CUP según la tasa actual.
 * - Si el producto está en USD: muestra USD y conversión a CUP usando tasa (+ extra si es cargador).
 * - Si el producto está en CUP: muestra CUP fijo (price_cup o price).
 */
export function computeDisplayPrice(product: PriceableProduct, rate: ExchangeRate | null) {
  const currency = (product.currency ?? "USD").toUpperCase();
  const isCharger = product.warranty_type === "charger";
  const extraPerUsd = Number(product.extra_cup_per_usd ?? 0) || (isCharger && rate ? Number(rate.extra_cup_chargers) : 0);

  if (currency === "CUP") {
    const cup = Number(product.price_cup ?? product.price);
    return { usd: null as number | null, cup, primary: "CUP" as const };
  }

  // USD
  const usd = Number(product.price);
  const cup = rate ? usd * (Number(rate.usd_to_cup) + Number(extraPerUsd)) : null;
  return { usd, cup, primary: "USD" as const };
}

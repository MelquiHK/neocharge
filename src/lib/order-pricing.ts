export interface OrderPricingBreakdown {
  productUSD: number | null;
  productCUP: number | null;
  productEUR: number | null;
  shippingUSD: number;
  shippingCUP: number;
  shippingEUR: number;
  totalUSD: number | null;
  totalCUP: number | null;
  totalEUR: number | null;
}

/**
 * Desglose del pedido. Sin tasa de cambio no se inventan conversiones:
 * los subtotales desconocidos entran como `null` y salen como `null`
 * (el registro en base de datos y el mensaje de WhatsApp omiten esa parte
 * en vez de mostrar un 0 engañoso).
 * El envío sí puede ser 0 de forma honesta: la recogida en local es gratis.
 * EUR: el subtotal en euros viene del total USD × tasaUSD ÷ tasaEUR, SIN
 * el extra de cargadores (solo pa CUP); el envío se cotiza en CUP y se
 * convierte a EUR dividiendo entre la tasa EUR (sin extra tampoco).
 */
export function buildOrderBreakdown({
  subtotal,
  subtotalCUP,
  subtotalEUR,
  shippingUSD,
  shippingCUP,
  shippingEUR,
}: {
  subtotal: number | null;
  subtotalCUP: number | null;
  subtotalEUR?: number | null;
  shippingUSD: number;
  shippingCUP: number;
  shippingEUR?: number;
}): OrderPricingBreakdown {
  const productUSD = subtotal ?? null;
  const productCUP = subtotalCUP ?? null;
  const productEUR = subtotalEUR ?? null;
  const shippingUsd = Number(shippingUSD || 0);
  const shippingCup = Number(shippingCUP || 0);
  const shippingEur = Number(shippingEUR || 0);

  return {
    productUSD,
    productCUP,
    productEUR,
    shippingUSD: shippingUsd,
    shippingCUP: shippingCup,
    shippingEUR: shippingEur,
    totalUSD: productUSD == null ? null : productUSD + shippingUsd,
    totalCUP: productCUP == null ? null : productCUP + shippingCup,
    totalEUR: productEUR == null ? null : Math.round((productEUR + shippingEur) * 100) / 100,
  };
}

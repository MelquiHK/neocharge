export interface OrderPricingBreakdown {
  productUSD: number | null;
  productCUP: number | null;
  shippingUSD: number;
  shippingCUP: number;
  totalUSD: number | null;
  totalCUP: number | null;
}

/**
 * Desglose del pedido. Sin tasa de cambio no se inventan conversiones:
 * los subtotales desconocidos entran como `null` y salen como `null`
 * (el registro en base de datos y el mensaje de WhatsApp omiten esa parte
 * en vez de mostrar un 0 engañoso).
 * El envío sí puede ser 0 de forma honesta: la recogida en local es gratis.
 */
export function buildOrderBreakdown({
  subtotal,
  subtotalCUP,
  shippingUSD,
  shippingCUP,
}: {
  subtotal: number | null;
  subtotalCUP: number | null;
  shippingUSD: number;
  shippingCUP: number;
}): OrderPricingBreakdown {
  const productUSD = subtotal ?? null;
  const productCUP = subtotalCUP ?? null;
  const shippingUsd = Number(shippingUSD || 0);
  const shippingCup = Number(shippingCUP || 0);

  return {
    productUSD,
    productCUP,
    shippingUSD: shippingUsd,
    shippingCUP: shippingCup,
    totalUSD: productUSD == null ? null : productUSD + shippingUsd,
    totalCUP: productCUP == null ? null : productCUP + shippingCup,
  };
}

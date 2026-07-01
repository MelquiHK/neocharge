export interface OrderPricingBreakdown {
  productUSD: number;
  productCUP: number;
  shippingUSD: number;
  shippingCUP: number;
  totalUSD: number;
  totalCUP: number;
}

export function buildOrderBreakdown({
  paymentCurrency,
  subtotal,
  subtotalCUP,
  shippingUSD,
  shippingCUP,
}: {
  paymentCurrency: "USD" | "CUP";
  subtotal: number;
  subtotalCUP: number;
  shippingUSD: number;
  shippingCUP: number;
}): OrderPricingBreakdown {
  const productUSD = Number(subtotal || 0);
  const productCUP = Number(subtotalCUP || 0);
  const shippingUsd = Number(shippingUSD || 0);
  const shippingCup = Number(shippingCUP || 0);

  return {
    productUSD,
    productCUP,
    shippingUSD: shippingUsd,
    shippingCUP: shippingCup,
    totalUSD: productUSD + shippingUsd,
    totalCUP: productCUP + shippingCup,
  };
}

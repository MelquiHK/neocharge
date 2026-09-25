import { describe, expect, it } from "vitest";
import { buildOrderBreakdown } from "./order-pricing";

describe("buildOrderBreakdown", () => {
  it("keeps product and shipping separated when the shipping fee is in CUP", () => {
    const breakdown = buildOrderBreakdown({
      subtotal: 50,
      subtotalCUP: 2300,
      shippingUSD: 0,
      shippingCUP: 2300,
    });

    expect(breakdown.productUSD).toBe(50);
    expect(breakdown.productCUP).toBe(2300);
    expect(breakdown.shippingUSD).toBe(0);
    expect(breakdown.shippingCUP).toBe(2300);
    expect(breakdown.totalUSD).toBe(50);
    expect(breakdown.totalCUP).toBe(4600);
  });
});

describe("buildOrderBreakdown sin tasa", () => {
  it("propaga null en vez de inventar conversiones con 0", () => {
    const breakdown = buildOrderBreakdown({
      subtotal: 50,
      subtotalCUP: null,
      shippingUSD: 0,
      shippingCUP: 0,
    });
    expect(breakdown.productUSD).toBe(50);
    expect(breakdown.productCUP).toBeNull();
    expect(breakdown.totalUSD).toBe(50);
    expect(breakdown.totalCUP).toBeNull();
  });

  it("suma el envío a la parte conocida sin tocar la desconocida", () => {
    const breakdown = buildOrderBreakdown({
      subtotal: 50,
      subtotalCUP: null,
      shippingUSD: 0,
      shippingCUP: 3100,
    });
    expect(breakdown.totalUSD).toBe(50);
    expect(breakdown.totalCUP).toBeNull();
    expect(breakdown.shippingCUP).toBe(3100);
  });
});

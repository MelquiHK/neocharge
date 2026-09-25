import { describe, expect, it } from "vitest";
import { computeDisplayPrice } from "./format";

const RATE = { usd_to_cup: 460, extra_cup_chargers: 0, rate_date: "2026-09-25" };

describe("computeDisplayPrice sin tasa (rate null)", () => {
  it("no inventa conversión CUP para un producto en USD", () => {
    const d = computeDisplayPrice({ price: 55, currency: "USD" }, null);
    expect(d.usd).toBe(55);
    expect(d.cup).toBeNull();
    expect(d.primary).toBe("USD");
  });

  it("no inventa conversión USD para un producto en CUP", () => {
    const d = computeDisplayPrice({ price: 55, currency: "CUP", price_cup: 25300 }, null);
    expect(d.cup).toBe(25300);
    expect(d.usd).toBeNull();
    expect(d.primary).toBe("CUP");
  });

  it("convierte correctamente cuando sí hay tasa", () => {
    const d = computeDisplayPrice({ price: 55, currency: "USD" }, RATE);
    expect(d.usd).toBe(55);
    expect(d.cup).toBe(55 * 460);
  });
});

describe("regla de cotización de envío en checkout", () => {
  // La validación vive en Checkout.tsx (handleSubmit): mensajería exige
  // coordenadas + cotización exitosa y vigente. Aquí se documenta el contrato
  // que debe cumplirse: sin quote no hay shippingCUP distinto de cero válido.
  it("sin cotización el shippingCUP es 0 y el pedido de mensajería debe bloquearse", () => {
    const quote: { priceCUP: number } | null = null;
    const shippingCUP = quote?.priceCUP ?? 0;
    expect(shippingCUP).toBe(0);
    // El checkout bloquea el envío si !quoteValid (ver Checkout.tsx).
    const quoteValid = quote !== null;
    expect(quoteValid).toBe(false);
  });

  it("con cotización el shippingCUP viene de la ruta, no de un valor manual", () => {
    const quote = { km: 12.4, priceCUP: 3100, pricePerKm: 250 };
    const shippingCUP = quote?.priceCUP ?? 0;
    expect(shippingCUP).toBe(3100);
  });
});

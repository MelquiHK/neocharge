import { describe, expect, it } from "vitest";
import {
  effectiveOwnStock,
  normalizePartnerCurrency,
  partnerMarginUsd,
  toUsd,
} from "./partner-sales";

describe("normalizePartnerCurrency", () => {
  it('devuelve "CUP" para "cup", "Cup" y "CUP"', () => {
    expect(normalizePartnerCurrency("cup")).toBe("CUP");
    expect(normalizePartnerCurrency("Cup")).toBe("CUP");
    expect(normalizePartnerCurrency("CUP")).toBe("CUP");
  });

  it('devuelve "USD" para "USD", null, undefined, "" y "eur"', () => {
    expect(normalizePartnerCurrency("USD")).toBe("USD");
    expect(normalizePartnerCurrency(null)).toBe("USD");
    expect(normalizePartnerCurrency(undefined)).toBe("USD");
    expect(normalizePartnerCurrency("")).toBe("USD");
    expect(normalizePartnerCurrency("eur")).toBe("USD");
  });
});

describe("effectiveOwnStock", () => {
  it("usa el stock propio cuando es positivo", () => {
    expect(effectiveOwnStock(5, 10, false)).toBe(5);
    expect(effectiveOwnStock(5, 10, true)).toBe(5);
  });

  it("usa el stock legado solo si el producto no está configurado", () => {
    expect(effectiveOwnStock(0, 10, false)).toBe(10);
    expect(effectiveOwnStock(0, 10, true)).toBe(0);
  });

  it("devuelve 0 cuando no hay stock en ninguna fuente", () => {
    expect(effectiveOwnStock(0, 0, false)).toBe(0);
    expect(effectiveOwnStock(0, 0, true)).toBe(0);
  });

  it("clampea entradas negativas a 0", () => {
    expect(effectiveOwnStock(-5, -3, false)).toBe(0);
    expect(effectiveOwnStock(0, -10, false)).toBe(0);
    expect(effectiveOwnStock(-5, 10, true)).toBe(0);
  });
});

describe("toUsd", () => {
  it("devuelve el monto tal cual para USD", () => {
    expect(toUsd(100, "USD", null)).toBe(100);
    expect(toUsd(100, "USD", 780)).toBe(100);
  });

  it("convierte CUP a USD con la tasa", () => {
    expect(toUsd(780, "CUP", 780)).toBe(1);
  });

  it("devuelve NaN sin tasa válida para CUP", () => {
    expect(toUsd(780, "CUP", null)).toBeNaN();
    expect(toUsd(780, "CUP", 0)).toBeNaN();
  });
});

describe("partnerMarginUsd", () => {
  it("calcula el margen cuando todo está en USD", () => {
    expect(partnerMarginUsd(50, "USD", 40, "USD", null)).toBe(10);
  });

  it("calcula el margen con venta en CUP y socio en USD", () => {
    expect(partnerMarginUsd(39000, "CUP", 40, "USD", 780)).toBe(10);
  });

  it("calcula el margen con venta en USD y socio en CUP", () => {
    expect(partnerMarginUsd(50, "USD", 31200, "CUP", 780)).toBe(10);
  });

  it("devuelve NaN sin tasa cuando hay CUP involucrado", () => {
    expect(partnerMarginUsd(39000, "CUP", 40, "USD", null)).toBeNaN();
    expect(partnerMarginUsd(50, "USD", 31200, "CUP", null)).toBeNaN();
  });
});

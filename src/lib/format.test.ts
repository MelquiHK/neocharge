import { describe, expect, it } from "vitest";
import {
  displayCategoryName,
  formatCUP,
  formatMoney,
  formatPrice,
  hasSaneDiscount,
  warrantyTypeLabel,
} from "./format";

describe("formatPrice (bug del doble símbolo de moneda)", () => {
  it("incluye el símbolo de moneda una sola vez", () => {
    // Intl es-CU con currency USD + narrowSymbol produce "$55.00":
    // quien renderiza NO debe añadir "US$" ni " USD" alrededor.
    expect(formatPrice(55)).toBe("$55.00");
  });

  it("no duplica el símbolo en miles", () => {
    expect(formatPrice(3000)).toBe("$3,000.00");
  });

  it("formatCUP usa sufijo CUP, no doble símbolo", () => {
    expect(formatCUP(15000)).toBe("15,000 CUP");
  });
});

describe("formatMoney", () => {
  it("formatea en USD por defecto", () => {
    expect(formatMoney(55, "USD")).toBe("$55.00");
    expect(formatMoney(55)).toBe("$55.00");
  });

  it("formatea en CUP cuando la moneda del producto es CUP", () => {
    // Regresión: el compare_price de productos CUP se mostraba como
    // "US$3,000.00" porque siempre se usaba el formateador USD.
    expect(formatMoney(3000, "CUP")).toBe("3,000 CUP");
    expect(formatMoney(2800, "cup")).toBe("2,800 CUP");
  });
});

describe("hasSaneDiscount", () => {
  it("acepta descuentos normales", () => {
    expect(hasSaneDiscount(55, 70)).toBe(true);
    expect(hasSaneDiscount(2800, 3000)).toBe(true); // 6.7%
  });

  it("acepta exactamente un 90% de descuento", () => {
    expect(hasSaneDiscount(10, 100)).toBe(true);
  });

  it("rechaza descuentos absurdos (>90%)", () => {
    expect(hasSaneDiscount(10, 3000)).toBe(false); // 99.7%
    expect(hasSaneDiscount(5, 3000)).toBe(false); // 99.8%
    expect(hasSaneDiscount(9, 100)).toBe(false); // 91%
  });

  it("rechaza compare_price menor o igual al precio", () => {
    expect(hasSaneDiscount(55, 55)).toBe(false);
    expect(hasSaneDiscount(55, 40)).toBe(false);
  });

  it("rechaza valores nulos, cero o no finitos", () => {
    expect(hasSaneDiscount(55, null)).toBe(false);
    expect(hasSaneDiscount(55, undefined)).toBe(false);
    expect(hasSaneDiscount(55, 0)).toBe(false);
    expect(hasSaneDiscount(NaN, 100)).toBe(false);
  });
});

describe("warrantyTypeLabel", () => {
  it("mapea los valores reales de la tabla products", () => {
    expect(warrantyTypeLabel("charger")).toBe("Garantía del cargador");
    expect(warrantyTypeLabel("electronics")).toBe("Garantía de electrónica");
  });

  it("nunca devuelve el valor crudo", () => {
    expect(warrantyTypeLabel("otro-valor")).toBe("Garantía incluida");
    expect(warrantyTypeLabel(null)).toBe("Garantía incluida");
    expect(warrantyTypeLabel(undefined)).toBe("Garantía incluida");
  });
});

describe("displayCategoryName", () => {
  it("normaliza tildes y capitalización", () => {
    expect(displayCategoryName("Cargador 48v")).toBe("Cargador 48V");
    expect(displayCategoryName("Audifonos")).toBe("Audífonos");
    expect(displayCategoryName("Energia Casa")).toBe("Energía para el hogar");
  });

  it("respeta nombres ya correctos", () => {
    expect(displayCategoryName("Cargadores 72V")).toBe("Cargadores 72V");
    expect(displayCategoryName("Audio")).toBe("Audio");
  });

  it("devuelve el original si no hay mapeo", () => {
    expect(displayCategoryName("Nueva Categoría")).toBe("Nueva Categoría");
    expect(displayCategoryName(null)).toBe("");
  });
});

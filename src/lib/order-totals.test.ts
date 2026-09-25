import { describe, it, expect } from "vitest";
import {
  normalizeCurrency,
  formatMoney,
  computeOrderTotals,
  presentTotals,
  validateDeliveryOrderForm,
  buildDeliveryOrderMessage,
  type DeliveryOrderFormFields,
} from "./order-totals";

describe("normalizeCurrency", () => {
  it("normaliza usd/CUP en cualquier capitalización", () => {
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(normalizeCurrency("USD")).toBe("USD");
    expect(normalizeCurrency("cup")).toBe("CUP");
    expect(normalizeCurrency("CUP")).toBe("CUP");
  });
  it("valor desconocido o vacío → USD por defecto", () => {
    expect(normalizeCurrency("EUR")).toBe("USD");
    expect(normalizeCurrency(null)).toBe("USD");
    expect(normalizeCurrency(undefined)).toBe("USD");
  });
});

describe("formatMoney", () => {
  it("formatea USD con 2 decimales", () => {
    expect(formatMoney(55, "USD")).toBe("$55.00 USD");
    expect(formatMoney(110.5, "USD")).toBe("$110.50 USD");
  });
  it("formatea CUP sin decimales", () => {
    expect(formatMoney(2050, "CUP")).toBe("2,050 CUP");
    expect(formatMoney(0, "CUP")).toBe("0 CUP");
  });
});

describe("computeOrderTotals", () => {
  it("productos solo en USD: subtotales separados y sin total único", () => {
    const t = computeOrderTotals(
      [{ name: "Cargador 72V/5A", unitPrice: 55, currency: "USD", quantity: 2 }],
      8.2,
      250,
    );
    expect(t.subtotalUsd).toBe(110);
    expect(t.subtotalCup).toBe(0);
    expect(t.deliveryCup).toBe(2050); // 8.2 × 250 redondeado
    expect(t.totalCupAll).toBeNull();
    expect(t.lines[0].lineTotal).toBe(110);
  });

  it("todo en CUP: suma única diferenciada", () => {
    const t = computeOrderTotals(
      [{ name: "Amplificador", unitPrice: 12000, currency: "CUP", quantity: 1 }],
      5,
      250,
    );
    expect(t.totalCupAll).toBe(13250);
    expect(t.hasUsdItems).toBe(false);
  });

  it("mezcla USD + CUP: cada moneda por su lado", () => {
    const t = computeOrderTotals(
      [
        { name: "Cargador", unitPrice: 55, currency: "USD", quantity: 1 },
        { name: "Cautín", unitPrice: 3000, currency: "CUP", quantity: 2 },
      ],
      4,
      250,
    );
    expect(t.subtotalUsd).toBe(55);
    expect(t.subtotalCup).toBe(6000);
    expect(t.deliveryCup).toBe(1000);
    expect(t.totalCupAll).toBeNull();
  });

  it("ignora cantidades inválidas", () => {
    const t = computeOrderTotals(
      [
        { name: "X", unitPrice: 10, currency: "USD", quantity: 0 },
        { name: "Y", unitPrice: 10, currency: "USD", quantity: -2 },
      ],
      1,
      250,
    );
    expect(t.lines.length).toBe(0);
  });
});

describe("presentTotals", () => {
  it("USD: productos y mensajería por separado, sin mezclar", () => {
    const t = computeOrderTotals(
      [{ name: "Cargador", unitPrice: 55, currency: "USD", quantity: 2 }],
      8.2,
      250,
    );
    const p = presentTotals(t);
    expect(p.productsLine).toBe("$110.00 USD");
    expect(p.deliveryLine).toContain("2,050 CUP");
    expect(p.totalLine).toBe("$110.00 USD + 2,050 CUP");
  });

  it("todo CUP: total sumado pero diferenciando partes", () => {
    const t = computeOrderTotals(
      [{ name: "Amplificador", unitPrice: 12000, currency: "CUP", quantity: 1 }],
      5,
      250,
    );
    const p = presentTotals(t);
    expect(p.totalLine).toContain("13,250 CUP");
    expect(p.totalLine).toContain("productos 12,000 CUP");
    expect(p.totalLine).toContain("mensajería 1,250 CUP");
  });
});

describe("validateDeliveryOrderForm", () => {
  const base: DeliveryOrderFormFields = {
    customerName: "Juan Pérez",
    customerPhone: "5363180910",
    street: "Calle D",
    houseNumber: "509",
  };

  it("formulario completo → ok", () => {
    expect(validateDeliveryOrderForm(base, 1).ok).toBe(true);
  });

  it("exige nombre, teléfono, calle y número", () => {
    const r = validateDeliveryOrderForm(
      { ...base, customerName: "", customerPhone: "12", street: "", houseNumber: "" },
      1,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.customerName).toBeTruthy();
    expect(r.errors.customerPhone).toBeTruthy();
    expect(r.errors.street).toBeTruthy();
    expect(r.errors.houseNumber).toBeTruthy();
  });

  it("el teléfono alternativo es opcional", () => {
    expect(validateDeliveryOrderForm({ ...base, altPhone: "" }, 1).ok).toBe(true);
    const r = validateDeliveryOrderForm({ ...base, altPhone: "12" }, 1);
    expect(r.ok).toBe(false);
    expect(r.errors.altPhone).toBeTruthy();
  });

  it("exige al menos un producto", () => {
    const r = validateDeliveryOrderForm(base, 0);
    expect(r.ok).toBe(false);
    expect(r.errors.items).toBeTruthy();
  });
});

describe("buildDeliveryOrderMessage", () => {
  const msg = buildDeliveryOrderMessage({
    customerName: "Juan Pérez",
    customerPhone: "55550000",
    altPhone: "55551111",
    street: "Calle D",
    houseNumber: "509",
    betweenStreets: "21 y 23",
    municipality: "Plaza de la Revolución",
    reference: "al lado de la bodega",
    destLat: 23.134742,
    destLng: -82.39116,
    stopLat: 23.14,
    stopLng: -82.4,
    originLabel: "Local Vedado",
    items: [{ name: "Cargador 72V/5A", unitPrice: 55, currency: "USD", quantity: 2 }],
    deliveryKm: 8.2,
    pricePerKm: 250,
  });

  it("incluye datos del cliente y dirección completa", () => {
    expect(msg).toContain("Juan Pérez");
    expect(msg).toContain("55550000");
    expect(msg).toContain("55551111");
    expect(msg).toContain("Calle: Calle D");
    expect(msg).toContain("No.: 509");
    expect(msg).toContain("Entre: 21 y 23");
    expect(msg).toContain("Municipio: Plaza de la Revolución");
    expect(msg).toContain("Referencia: al lado de la bodega");
  });

  it("incluye coordenadas, parada, km y productos con cantidades", () => {
    expect(msg).toContain("23.134742, -82.391160");
    expect(msg).toContain("Parada intermedia");
    expect(msg).toContain("8.2 km");
    expect(msg).toContain("Cargador 72V/5A");
    expect(msg).toContain("2 × $55.00 USD = $110.00 USD");
    expect(msg).toContain("Mensajería");
    expect(msg).toContain("2,050 CUP");
    expect(msg).toContain("$110.00 USD + 2,050 CUP");
  });

  it("no contiene el número prohibido", () => {
    expect(msg).not.toContain("53548379");
  });
});

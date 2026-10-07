import { describe, it, expect } from "vitest";
import {
  ORDER_STATUS_LABELS,
  ORDER_TIMELINE_STEPS,
  orderStatusLabel,
  orderStatusStepIndex,
  shortOrderId,
} from "./order-status";

describe("orderStatusLabel", () => {
  it("traduce los 6 estados del enum a español", () => {
    expect(orderStatusLabel("pending")).toBe("Pendiente");
    expect(orderStatusLabel("confirmed")).toBe("Confirmado");
    expect(orderStatusLabel("preparing")).toBe("En preparación");
    expect(orderStatusLabel("shipped")).toBe("Enviado/Listo");
    expect(orderStatusLabel("delivered")).toBe("Entregado");
    expect(orderStatusLabel("cancelled")).toBe("Cancelado");
  });

  it("devuelve el valor tal cual si el estado es desconocido", () => {
    expect(orderStatusLabel("weird")).toBe("weird");
  });

  it("cubre todos los estados del enum", () => {
    expect(Object.keys(ORDER_STATUS_LABELS).sort()).toEqual(
      ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"].sort()
    );
  });
});

describe("ORDER_TIMELINE_STEPS", () => {
  it("tiene 5 pasos en orden y no incluye cancelled", () => {
    expect(ORDER_TIMELINE_STEPS).toEqual([
      "pending",
      "confirmed",
      "preparing",
      "shipped",
      "delivered",
    ]);
  });
});

describe("orderStatusStepIndex", () => {
  it("devuelve el índice correcto de cada paso", () => {
    expect(orderStatusStepIndex("pending")).toBe(0);
    expect(orderStatusStepIndex("confirmed")).toBe(1);
    expect(orderStatusStepIndex("preparing")).toBe(2);
    expect(orderStatusStepIndex("shipped")).toBe(3);
    expect(orderStatusStepIndex("delivered")).toBe(4);
  });

  it("devuelve -1 para cancelled y estados desconocidos", () => {
    expect(orderStatusStepIndex("cancelled")).toBe(-1);
    expect(orderStatusStepIndex("weird")).toBe(-1);
  });
});

describe("shortOrderId", () => {
  it("toma los primeros 8 caracteres en mayúsculas", () => {
    expect(shortOrderId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("A1B2C3D4");
  });

  it("tolera valores vacíos", () => {
    expect(shortOrderId("")).toBe("");
  });
});

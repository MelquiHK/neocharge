import { describe, expect, it } from "vitest";
import { batteryTypeChip } from "./product-display";

describe("batteryTypeChip", () => {
  it("usa el campo explícito del admin con prioridad", () => {
    expect(
      batteryTypeChip({ name: "Cargador de 72V/7A", warranty_type: "charger-1w", battery_type: "litio" })
    ).toBe("Para baterías de litio");
    expect(
      batteryTypeChip({ name: "Cargador de 60V/10A", warranty_type: "charger-1w", battery_type: "gel" })
    ).toBe("Para baterías de plomo-ácido/gel");
    expect(
      batteryTypeChip({ name: "Cargador de 48V/5A", warranty_type: "charger", battery_type: "lifepo4" })
    ).toBe("Para baterías LiFePO4");
  });

  it("reconoce charger-1w como cargador aunque el nombre no lo diga", () => {
    expect(
      batteryTypeChip({ name: "Fuente X", warranty_type: "charger-1w", battery_type: "litio" })
    ).toBe("Para baterías de litio");
  });

  it("devuelve null para productos que no son cargadores", () => {
    expect(
      batteryTypeChip({ name: "Amplificador Clase D", warranty_type: "electronics", battery_type: "litio" })
    ).toBe(null);
  });
});

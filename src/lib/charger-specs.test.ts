import { describe, expect, it } from "vitest";
import { parseChargerSpecifications, parseNumber } from "./charger-specs";

describe("parseChargerSpecifications", () => {
  it("extrae voltaje y corriente del texto de especificaciones", () => {
    const specs = parseChargerSpecifications("Voltaje: 72V\nCorriente: 5A");
    expect(specs.voltage).toBe(72);
    expect(specs.current).toBe(5);
  });

  it("usa el nombre del producto como respaldo cuando las specs no traen voltaje", () => {
    const specs = parseChargerSpecifications(
      "Cargador inteligente con ventilador silencioso",
      "Cargador de 72V/5A"
    );
    expect(specs.voltage).toBe(72);
    expect(specs.current).toBe(5);
  });

  it("el texto de specs tiene prioridad sobre el nombre", () => {
    const specs = parseChargerSpecifications("Voltaje: 60V", "Cargador de 72V/5A");
    expect(specs.voltage).toBe(60);
    // La corriente sí se completa desde el nombre porque el texto no la trae.
    expect(specs.current).toBe(5);
  });

  it("entiende el formato '48V 3A' del nombre", () => {
    const specs = parseChargerSpecifications(null, "Cargador 48V 3A plomo ácido");
    expect(specs.voltage).toBe(48);
    expect(specs.current).toBe(3);
    expect(specs.batteryTypes).toContain("Plomo-ácido/Gel");
  });

  it("devuelve objeto vacío cuando no hay datos", () => {
    expect(parseChargerSpecifications(null, null)).toEqual({});
    expect(parseChargerSpecifications("", "")).toEqual({});
  });

  it("ignora menciones de amperaje en prosa de marketing (caso real 72V/5A)", () => {
    // Las specs reales del "Cargador de 72V/5A" dicen
    // "hasta 2× más rápido que el 3A": ese 3A no es la corriente del
    // producto. Debe completarse desde el nombre.
    const specs = parseChargerSpecifications(
      "• Carga rápida: hasta 2× más rápido que el 3A\n• Ventilador inteligente con sensor de temperatura",
      "Cargador de 72V/5A"
    );
    expect(specs.voltage).toBe(72);
    expect(specs.current).toBe(5);
  });

  it("acepta corriente con etiqueta explícita", () => {
    expect(parseChargerSpecifications("Corriente de carga: 5A").current).toBe(5);
    expect(parseChargerSpecifications("Amperaje: 10A").current).toBe(10);
    expect(parseChargerSpecifications("Salida: 72V 3A").current).toBe(3);
  });

  it("no inventa corriente desde prosa sin contexto de especificación", () => {
    const specs = parseChargerSpecifications(
      "Ideal para tu moto, carga 2 veces más rápido que el 3A"
    );
    expect(specs.current).toBeUndefined();
  });
});

describe("parseNumber", () => {
  it("acepta coma decimal", () => {
    expect(parseNumber("20,5")).toBe(20.5);
  });

  it("devuelve undefined para valores vacíos", () => {
    expect(parseNumber("")).toBeUndefined();
    expect(parseNumber(null)).toBeUndefined();
  });
});

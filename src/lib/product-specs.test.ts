import { describe, expect, it } from "vitest";
import { cleanSpecLine, parseSpecGroups } from "./product-specs";

describe("cleanSpecLine", () => {
  it.each([
    ["• Carga Rápida", "Carga Rápida"],
    ["- Ventilador Inteligente", "Ventilador Inteligente"],
    ["✓ Protección Total", "Protección Total"],
    ["✔ Indicadores LED", "Indicadores LED"],
    ["* Cable reforzado", "Cable reforzado"],
    ["✓ • Doble marcador", "Doble marcador"],
    ["  •   Espacios sobrantes  ", "Espacios sobrantes"],
    ["-Cable pegado", "Cable pegado"],
    ["Carga Rápida - Hasta 2× más rápido", "Carga Rápida - Hasta 2× más rápido"],
    // Un número negativo real no es una viñeta: se conserva.
    ["-20°C a 60°C", "-20°C a 60°C"],
    ["", ""],
  ])("limpia %j", (input, expected) => {
    expect(cleanSpecLine(input)).toBe(expected);
  });

  it("devuelve cadena vacía para null/undefined", () => {
    expect(cleanSpecLine(null)).toBe("");
    expect(cleanSpecLine(undefined)).toBe("");
  });
});

describe("parseSpecGroups", () => {
  it("clasifica 'Etiqueta: valor' como filas y el resto como viñetas", () => {
    const [group] = parseSpecGroups(
      "Batería: 20,000 mAh reales\n• Carga rápida\nVentilador inteligente"
    );
    expect(group.rows).toEqual([{ label: "Batería", value: "20,000 mAh reales" }]);
    expect(group.bullets).toEqual(["Carga rápida", "Ventilador inteligente"]);
  });

  it("una URL nunca se trata como etiqueta", () => {
    const [group] = parseSpecGroups("https://ejemplo.com:8080/manual.pdf");
    expect(group.rows).toHaveLength(0);
    expect(group.bullets).toHaveLength(1);
  });

  it("acepta un array JSON de strings", () => {
    const [group] = parseSpecGroups(JSON.stringify(["• Voltaje: 72V", "Protección total"]));
    expect(group.rows).toEqual([{ label: "Voltaje", value: "72V" }]);
    expect(group.bullets).toEqual(["Protección total"]);
  });

  it("acepta un objeto JSON como tabla", () => {
    const [group] = parseSpecGroups(JSON.stringify({ Voltaje: "72V", Corriente: "5A" }));
    expect(group.rows).toHaveLength(2);
    expect(group.bullets).toHaveLength(0);
  });

  it("acepta grupos JSON con título e ítems", () => {
    const [group] = parseSpecGroups(
      JSON.stringify([
        { title: "Seguridad", items: ["• Protección total", "IP67: resistente al agua"] },
      ])
    );
    expect(group.title).toBe("Seguridad");
    expect(group.bullets).toEqual(["Protección total"]);
    expect(group.rows).toEqual([{ label: "IP67", value: "resistente al agua" }]);
  });

  it("devuelve [] para especificaciones vacías", () => {
    expect(parseSpecGroups(null)).toEqual([]);
    expect(parseSpecGroups("   ")).toEqual([]);
  });
});

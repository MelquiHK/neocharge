import { describe, it, expect } from "vitest";
import { normalizeCubanPhone, formatCubanPhoneDisplay } from "./cuban-phone";

describe("normalizeCubanPhone", () => {
  it("acepta móvil de 8 dígitos y antepone 53", () => {
    expect(normalizeCubanPhone("58427265")).toBe("5358427265");
  });

  it("acepta móviles que empiezan con 6 (series nuevas de ETECSA)", () => {
    expect(normalizeCubanPhone("63180910")).toBe("5363180910");
    expect(normalizeCubanPhone("+53 63180910")).toBe("5363180910");
    expect(normalizeCubanPhone("5363180910")).toBe("5363180910");
  });

  it("acepta formatos con espacios, guiones y +53", () => {
    expect(normalizeCubanPhone("53 5842 7265")).toBe("5358427265");
    expect(normalizeCubanPhone("+53 5842-7265")).toBe("5358427265");
    expect(normalizeCubanPhone("5358427265")).toBe("5358427265");
  });

  it("rechaza fijos y formatos inválidos", () => {
    expect(normalizeCubanPhone("78301234")).toBeNull(); // fijo de La Habana
    expect(normalizeCubanPhone("12345")).toBeNull();
    expect(normalizeCubanPhone("")).toBeNull();
    expect(normalizeCubanPhone("5842726")).toBeNull(); // 7 dígitos
    expect(normalizeCubanPhone("584272657")).toBeNull(); // 9 dígitos
    expect(normalizeCubanPhone("abc")).toBeNull();
  });

  it("rechaza números que no son móviles cubanos", () => {
    expect(normalizeCubanPhone("5312345678")).toBeNull(); // no empieza por 5 o 6 tras el 53
  });
});

describe("formatCubanPhoneDisplay", () => {
  it("formatea 5358427265 como +53 5842 7265", () => {
    expect(formatCubanPhoneDisplay("5358427265")).toBe("+53 5842 7265");
  });
});

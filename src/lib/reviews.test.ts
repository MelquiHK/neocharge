import { describe, expect, it } from "vitest";
import { computeReviewStats, displayReviewerName } from "./reviews";

describe("computeReviewStats", () => {
  it("sin reseñas devuelve ceros", () => {
    const stats = computeReviewStats([]);
    expect(stats.count).toBe(0);
    expect(stats.average).toBe(0);
    expect(stats.distribution).toHaveLength(5);
    expect(stats.distribution.every((b) => b.count === 0 && b.pct === 0)).toBe(true);
  });

  it("calcula el promedio redondeado a 1 decimal", () => {
    expect(computeReviewStats([{ rating: 5 }, { rating: 4 }]).average).toBe(4.5);
    expect(computeReviewStats([{ rating: 5 }, { rating: 5 }, { rating: 4 }]).average).toBe(4.7);
  });

  it("distribuye por estrellas de 5 a 1 con porcentajes", () => {
    const stats = computeReviewStats([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 3 },
    ]);
    expect(stats.count).toBe(4);
    expect(stats.distribution.map((b) => b.stars)).toEqual([5, 4, 3, 2, 1]);
    const byStars = Object.fromEntries(stats.distribution.map((b) => [b.stars, b]));
    expect(byStars[5].count).toBe(2);
    expect(byStars[5].pct).toBe(50);
    expect(byStars[4].pct).toBe(25);
    expect(byStars[3].pct).toBe(25);
    expect(byStars[2].pct).toBe(0);
    expect(byStars[1].count).toBe(0);
  });

  it("ignora ratings fuera de 1-5 sin romper el cálculo", () => {
    const stats = computeReviewStats([
      { rating: 5 },
      { rating: 0 },
      { rating: 6 },
      { rating: Number.NaN },
    ]);
    expect(stats.count).toBe(1);
    expect(stats.average).toBe(5);
  });
});

describe("displayReviewerName", () => {
  it("prefiere full_name", () => {
    expect(
      displayReviewerName({ id: "1", full_name: "Ana Pérez", username: "ana123" }),
    ).toBe("Ana Pérez");
  });

  it("usa username si no hay full_name", () => {
    expect(displayReviewerName({ id: "1", full_name: null, username: "ana123" })).toBe(
      "ana123",
    );
  });

  it("devuelve el genérico si no hay nombre", () => {
    expect(displayReviewerName({ id: "1" })).toBe("Cliente de NeoCharge");
    expect(displayReviewerName(null)).toBe("Cliente de NeoCharge");
    expect(displayReviewerName(undefined, "Anónimo")).toBe("Anónimo");
  });

  it("recorta espacios en blanco", () => {
    expect(displayReviewerName({ id: "1", full_name: "   " })).toBe("Cliente de NeoCharge");
  });
});

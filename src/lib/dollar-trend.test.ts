import { describe, expect, it } from "vitest";
import { avgDailyChange, projectRate, projectedDateLabel, sortedAsc } from "./dollar-trend";

describe("sortedAsc", () => {
  it("ordena por fecha y descarta inválidos", () => {
    const pts = [
      { date: "2026-10-01", rate: 760 },
      { date: "2026-09-28", rate: 740 },
      { date: "mala", rate: 1 },
      { date: "2026-09-30", rate: 750 },
    ];
    expect(sortedAsc(pts).map((p) => p.date)).toEqual(["2026-09-28", "2026-09-30", "2026-10-01"]);
  });
});

describe("avgDailyChange", () => {
  const now = new Date("2026-10-01T12:00:00");
  const pts = [
    { date: "2026-09-24", rate: 720 },
    { date: "2026-09-26", rate: 730 },
    { date: "2026-09-28", rate: 740 },
    { date: "2026-09-30", rate: 750 },
    { date: "2026-10-01", rate: 760 },
  ];

  it("calcula el promedio diario en la ventana de 7 días", () => {
    // ventana: 2026-09-24..2026-10-01 → (760-720)/7 = 5.71
    const avg = avgDailyChange(pts, 7, now);
    expect(avg).toBeCloseTo(40 / 7, 5);
  });

  it("usa los días calendario reales entre primer y último punto", () => {
    const sparse = [
      { date: "2026-09-20", rate: 700 },
      { date: "2026-10-01", rate: 760 },
    ];
    // 60 CUP en 11 días
    expect(avgDailyChange(sparse, 30, now)).toBeCloseTo(60 / 11, 5);
  });

  it("null con menos de 2 puntos en la ventana", () => {
    expect(avgDailyChange([{ date: "2026-10-01", rate: 760 }], 7, now)).toBeNull();
    expect(avgDailyChange([], 7, now)).toBeNull();
  });

  it("ignora puntos fuera de la ventana", () => {
    const avg = avgDailyChange([...pts, { date: "2026-08-01", rate: 600 }], 7, now);
    expect(avg).toBeCloseTo(40 / 7, 5);
  });
});

describe("projectRate", () => {
  it("proyecta linealmente", () => {
    expect(projectRate(760, 5, 7)).toBe(795);
    expect(projectRate(760, 0, 30)).toBe(760);
    expect(projectRate(760, -2, 7)).toBe(746);
  });
});

describe("projectedDateLabel", () => {
  it("formatea D/M", () => {
    expect(projectedDateLabel(new Date("2026-10-01T12:00:00"), 7)).toBe("8/10");
  });
});

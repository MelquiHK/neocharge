import { describe, expect, it } from "vitest";
import {
  avgDailyChange,
  chargerImpact,
  dailyChanges,
  momentum,
  projectMultiModel,
  projectRate,
  projectedDateFull,
  projectedDateLabel,
  scenarioDate,
  sortedAsc,
  volatility,
  weightedAvgDailyChange,
} from "./dollar-trend";

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

describe("projectedDateFull", () => {
  it("formatea D/M/AAAA", () => {
    expect(projectedDateFull(new Date("2026-10-01T12:00:00"), 7)).toBe("8/10/2026");
  });
});

describe("dailyChanges", () => {
  it("calcula el cambio por día entre puntos consecutivos", () => {
    const pts = [
      { date: "2026-09-29", rate: 745 },
      { date: "2026-09-30", rate: 750 },
      { date: "2026-10-01", rate: 760 },
    ];
    expect(dailyChanges(pts)).toEqual([
      { date: "2026-09-30", change: 5 },
      { date: "2026-10-01", change: 10 },
    ]);
  });

  it("normaliza por los días entre registros con huecos", () => {
    const pts = [
      { date: "2026-09-27", rate: 735 },
      { date: "2026-10-01", rate: 755 },
    ];
    // 20 CUP en 4 días = 5/día
    expect(dailyChanges(pts)).toEqual([{ date: "2026-10-01", change: 5 }]);
  });

  it("vacío con menos de 2 puntos", () => {
    expect(dailyChanges([])).toEqual([]);
    expect(dailyChanges([{ date: "2026-10-01", rate: 760 }])).toEqual([]);
  });
});

describe("weightedAvgDailyChange", () => {
  it("los días recientes pesan más", () => {
    const pts = [
      { date: "2026-09-28", rate: 740 },
      { date: "2026-09-29", rate: 742 }, // +2
      { date: "2026-09-30", rate: 744 }, // +2
      { date: "2026-10-01", rate: 754 }, // +10
    ];
    const now = new Date("2026-10-01T12:00:00");
    const w = weightedAvgDailyChange(pts, 30, now)!;
    const plain = avgDailyChange(pts, 30, now)!;
    // ponderado: (1*2 + 2*2 + 3*10)/6 = 36/6 = 6 > promedio simple 14/3 ≈ 4.67
    expect(w).toBeCloseTo(6, 5);
    expect(w).toBeGreaterThan(plain);
  });

  it("null sin cambios en la ventana", () => {
    expect(weightedAvgDailyChange([], 30)).toBeNull();
    expect(weightedAvgDailyChange([{ date: "2026-10-01", rate: 760 }], 30)).toBeNull();
  });
});

describe("projectMultiModel", () => {
  it("devuelve el rango entre modelos, no un solo número", () => {
    const p = projectMultiModel(
      760,
      [
        { name: "A", avgDaily: 5 },
        { name: "B", avgDaily: 3 },
        { name: "C", avgDaily: 7 },
      ],
      7,
      new Date("2026-10-01T12:00:00")
    )!;
    expect(p.models.map((m) => m.rate)).toEqual([795, 781, 809]);
    expect(p.min).toBe(781);
    expect(p.max).toBe(809);
    expect(p.mid).toBe(795);
    expect(p.label).toBe("8/10");
  });

  it("ignora modelos sin datos y null si no queda ninguno", () => {
    const p = projectMultiModel(760, [{ name: "A", avgDaily: 5 }, { name: "B", avgDaily: NaN }], 7)!;
    expect(p.models).toHaveLength(1);
    expect(projectMultiModel(760, [{ name: "B", avgDaily: NaN }], 7)).toBeNull();
  });
});

describe("momentum", () => {
  const now = new Date("2026-10-01T12:00:00");
  const mk = (changes: Array<[string, number]>) => {
    // reconstruye puntos a partir de cambios diarios consecutivos
    let rate = 700;
    const pts = [{ date: "2026-09-16", rate }];
    for (const [date, ch] of changes) {
      rate += ch;
      pts.push({ date, rate });
    }
    return pts;
  };

  it("detecta aceleración", () => {
    const pts = mk([
      ["2026-09-18", 2], ["2026-09-20", 2], ["2026-09-22", 2], ["2026-09-24", 2], // previos
      ["2026-09-26", 8], ["2026-09-28", 8], ["2026-09-30", 8], ["2026-10-01", 8], // recientes
    ]);
    const m = momentum(pts, now)!;
    expect(m.label).toBe("acelerando");
    expect(m.recentAvg).toBeGreaterThan(m.prevAvg);
  });

  it("detecta frenada", () => {
    const pts = mk([
      ["2026-09-18", 8], ["2026-09-20", 8], ["2026-09-22", 8], ["2026-09-24", 8],
      ["2026-09-26", 2], ["2026-09-28", 2], ["2026-09-30", 2], ["2026-10-01", 2],
    ]);
    expect(momentum(pts, now)!.label).toBe("frenando");
  });

  it("estable cuando el ritmo no cambia mucho", () => {
    const pts = mk([
      ["2026-09-18", 5], ["2026-09-20", 5], ["2026-09-22", 5], ["2026-09-24", 5],
      ["2026-09-26", 5], ["2026-09-28", 6], ["2026-09-30", 5], ["2026-10-01", 5],
    ]);
    expect(momentum(pts, now)!.label).toBe("estable");
  });

  it("null sin 14 días de historial", () => {
    expect(momentum([{ date: "2026-10-01", rate: 760 }], now)).toBeNull();
  });
});

describe("volatility", () => {
  it("clasifica mercado tranquilo / normal / nervioso", () => {
    const calm = [
      { date: "2026-09-28", rate: 740 },
      { date: "2026-09-29", rate: 741 },
      { date: "2026-09-30", rate: 742 },
      { date: "2026-10-01", rate: 743 },
    ];
    expect(volatility(calm, 30, new Date("2026-10-01T12:00:00"))!.label).toBe("tranquilo");

    const wild = [
      { date: "2026-09-28", rate: 740 },
      { date: "2026-09-29", rate: 750 },
      { date: "2026-09-30", rate: 742 },
      { date: "2026-10-01", rate: 758 },
    ];
    const v = volatility(wild, 30, new Date("2026-10-01T12:00:00"))!;
    expect(v.std).toBeGreaterThan(5);
    expect(v.label).toBe("nervioso");
  });

  it("null con menos de 2 cambios", () => {
    expect(volatility([{ date: "2026-10-01", rate: 760 }], 30)).toBeNull();
  });
});

describe("scenarioDate", () => {
  const now = new Date("2026-10-01T12:00:00");

  it("calcula la fecha a ritmo constante", () => {
    // (800-760)/5 = 8 días → 9/10/2026
    const c = scenarioDate(760, 5, 800, now);
    expect(c.days).toBe(8);
    expect(c.reached).toBe(false);
    expect(c.date).toBe("9/10/2026");
  });

  it("redondea hacia arriba los días parciales", () => {
    // (800-760)/3 = 13.34 → 14 días
    expect(scenarioDate(760, 3, 800, now).days).toBe(14);
  });

  it("marca 'ya' si el objetivo se alcanzó", () => {
    const c = scenarioDate(760, 5, 750, now);
    expect(c.reached).toBe(true);
    expect(c.date).toBe("ya");
  });
});

describe("chargerImpact", () => {
  it("convierte USD a CUP con la tasa efectiva y los rangos", () => {
    const rows = chargerImpact(
      [{ name: "Cargador 72V/5A", usd: 60 }],
      770, // 760 + 10 de extra
      { min: 800, max: 820 },
      { min: 830, max: 870 }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cupNow).toBe(46200);
    expect(rows[0].cup7min).toBe(48000);
    expect(rows[0].cup7max).toBe(49200);
    expect(rows[0].cup14min).toBe(49800);
    expect(rows[0].cup14max).toBe(52200);
  });
});

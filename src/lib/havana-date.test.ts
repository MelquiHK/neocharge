import { describe, expect, it } from "vitest";
import { havanaDate, startOfHavanaDayISO, startOfHavanaMonthISO } from "./havana-date";

describe("havana-date", () => {
  it("havanaDate devuelve YYYY-MM-DD en zona Habana", () => {
    // 2026-10-09 02:30 UTC = 2026-10-08 22:30 en Cuba (UTC-4)
    const d = new Date("2026-10-09T02:30:00Z");
    expect(havanaDate(d)).toBe("2026-10-08");
  });

  it("startOfHavanaDayISO es la medianoche habanera en UTC", () => {
    // medianoche del 8/10 en Cuba = 04:00 UTC del 8/10
    const iso = startOfHavanaDayISO(new Date("2026-10-08T15:00:00Z"));
    expect(iso).toBe("2026-10-08T04:00:00.000Z");
  });

  it("startOfHavanaMonthISO es el día 1 a medianoche habanera", () => {
    const iso = startOfHavanaMonthISO(new Date("2026-10-20T15:00:00Z"));
    expect(iso).toBe("2026-10-01T04:00:00.000Z");
  });

  it("el rango del día contiene instantes del día habanero", () => {
    const start = new Date(startOfHavanaDayISO(new Date("2026-10-08T15:00:00Z"))).getTime();
    // 8/10 22:30 Cuba = 9/10 02:30 UTC -> dentro del día 8 habanero
    const t = new Date("2026-10-09T02:30:00Z").getTime();
    expect(t).toBeGreaterThanOrEqual(start);
    expect(t).toBeLessThan(start + 24 * 3600 * 1000);
  });
});

import { describe, expect, it } from "vitest";
import { getUnseenRecords, isGenuinelyNew } from "./order-notifications.utils";

describe("getUnseenRecords", () => {
  it("filtra los ids ya vistos", () => {
    const seen = new Set(["a", "b"]);
    const out = getUnseenRecords(seen, [{ id: "a" }, { id: "c" }, { id: "" }, {}]);
    expect(out.map((r) => r.id)).toEqual(["c"]);
  });
});

describe("isGenuinelyNew", () => {
  const maxKnown = new Date("2026-10-08T18:00:00Z").getTime();

  it("acepta registros más nuevos que lo conocido", () => {
    expect(isGenuinelyNew("2026-10-08T18:00:01Z", maxKnown)).toBe(true);
  });

  it("rechaza registros viejos o con la misma fecha (el bug de los pedidos revividos)", () => {
    expect(isGenuinelyNew("2026-10-08T17:59:59Z", maxKnown)).toBe(false);
    expect(isGenuinelyNew("2026-10-08T18:00:00Z", maxKnown)).toBe(false);
  });

  it("rechaza fechas inválidas o ausentes", () => {
    expect(isGenuinelyNew(undefined, maxKnown)).toBe(false);
    expect(isGenuinelyNew(null, maxKnown)).toBe(false);
    expect(isGenuinelyNew("no-es-fecha", maxKnown)).toBe(false);
  });
});

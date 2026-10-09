import { describe, it, expect, beforeEach } from "vitest";
import { idbSet, idbGet, idbDelete, idbKeys, idbClearAll } from "./db";

beforeEach(async () => {
  await idbClearAll();
});

describe("offline db", () => {
  it("guarda y lee un registro con su fecha", async () => {
    await idbSet("kv", "products_v1", [{ id: 1 }]);
    const rec = await idbGet<{ id: number }[]>("kv", "products_v1");
    expect(rec?.value).toEqual([{ id: 1 }]);
    expect(typeof rec?.savedAt).toBe("number");
  });

  it("devuelve null para claves inexistentes", async () => {
    expect(await idbGet("kv", "no-existe")).toBeNull();
  });

  it("sobrescribe el valor anterior", async () => {
    await idbSet("kv", "k", { v: 1 });
    await idbSet("kv", "k", { v: 2 });
    const rec = await idbGet<{ v: number }>("kv", "k");
    expect(rec?.value).toEqual({ v: 2 });
  });

  it("elimina claves", async () => {
    await idbSet("kv", "k", 1);
    await idbDelete("kv", "k");
    expect(await idbGet("kv", "k")).toBeNull();
  });

  it("lista las claves del almacén", async () => {
    await idbSet("kv", "a", 1);
    await idbSet("kv", "b", 2);
    const keys = await idbKeys("kv");
    expect(keys.sort()).toEqual(["a", "b"]);
  });

  it("los almacenes son independientes", async () => {
    await idbSet("kv", "k", "kv-value");
    await idbSet("queue", "k", "queue-value");
    expect((await idbGet<string>("kv", "k"))?.value).toBe("kv-value");
    expect((await idbGet<string>("queue", "k"))?.value).toBe("queue-value");
  });
});

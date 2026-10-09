import { describe, it, expect, beforeEach } from "vitest";
import {
  queuePendingOrder,
  getPendingOrders,
  getPendingOrder,
  removePendingOrder,
  countPendingOrders,
  flushPendingOrders,
} from "./pending-orders";
import { idbClearAll } from "./db";

beforeEach(async () => {
  await idbClearAll();
});

describe("pending-orders", () => {
  it("encola y recupera un pedido", async () => {
    await queuePendingOrder("order-1", { id: "order-1", total: 100 });
    const found = await getPendingOrder("order-1");
    expect(found?.id).toBe("order-1");
    expect(found?.payload).toMatchObject({ total: 100 });
    expect(await countPendingOrders()).toBe(1);
  });

  it("devuelve null para un pedido inexistente", async () => {
    expect(await getPendingOrder("no-existe")).toBeNull();
  });

  it("elimina pedidos de la cola", async () => {
    await queuePendingOrder("order-1", { id: "order-1" });
    await removePendingOrder("order-1");
    expect(await countPendingOrders()).toBe(0);
  });

  it("flush envía en orden y limpia la cola", async () => {
    await queuePendingOrder("a", { id: "a" });
    await queuePendingOrder("b", { id: "b" });
    const sent: string[] = [];
    const result = await flushPendingOrders(async (payload) => {
      sent.push(String(payload.id));
    });
    expect(result).toEqual({ sent: ["a", "b"], failed: [] });
    expect(sent).toEqual(["a", "b"]);
    expect(await countPendingOrders()).toBe(0);
  });

  it("flush conserva los que fallan para reintentar", async () => {
    await queuePendingOrder("ok", { id: "ok" });
    await queuePendingOrder("bad", { id: "bad" });
    const result = await flushPendingOrders(async (payload) => {
      if (payload.id === "bad") throw new Error("network down");
    });
    expect(result.sent).toEqual(["ok"]);
    expect(result.failed).toEqual(["bad"]);
    // El fallido sigue en la cola; el enviado ya no.
    expect(await getPendingOrder("bad")).not.toBeNull();
    expect(await getPendingOrder("ok")).toBeNull();
  });

  it("re-encolar el mismo id no duplica (idempotente)", async () => {
    await queuePendingOrder("x", { id: "x", v: 1 });
    await queuePendingOrder("x", { id: "x", v: 2 });
    expect(await countPendingOrders()).toBe(1);
    const found = await getPendingOrder("x");
    expect(found?.payload).toMatchObject({ v: 2 });
  });
});

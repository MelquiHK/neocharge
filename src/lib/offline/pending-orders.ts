/**
 * Cola de pedidos hechos sin conexión.
 *
 * Si el cliente confirma un pedido sin internet, el pedido se guarda aquí
 * (con el mismo id que tendría online) y se envía solo cuando vuelve la
 * conexión. El id se genera en el cliente, así que no hay duplicados al
 * reintentar: el flush es idempotente por id.
 */

import { idbSet, idbGet, idbDelete, idbKeys } from "./db";

const STORE = "queue" as const;
const keyFor = (orderId: string) => `order:${orderId}`;

export interface PendingOrder {
  id: string;
  payload: Record<string, unknown>;
  queuedAt: number;
}

export async function queuePendingOrder(orderId: string, payload: Record<string, unknown>): Promise<void> {
  const order: PendingOrder = { id: orderId, payload, queuedAt: Date.now() };
  await idbSet(STORE, keyFor(orderId), order);
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const keys = await idbKeys(STORE);
  const orders: PendingOrder[] = [];
  for (const key of keys) {
    if (!key.startsWith("order:")) continue;
    const rec = await idbGet<PendingOrder>(STORE, key);
    if (rec) orders.push(rec.value);
  }
  return orders.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function getPendingOrder(orderId: string): Promise<PendingOrder | null> {
  const rec = await idbGet<PendingOrder>(STORE, keyFor(orderId));
  return rec ? rec.value : null;
}

export async function removePendingOrder(orderId: string): Promise<void> {
  await idbDelete(STORE, keyFor(orderId));
}

export async function countPendingOrders(): Promise<number> {
  const keys = await idbKeys(STORE);
  return keys.filter((k) => k.startsWith("order:")).length;
}

export interface FlushResult {
  sent: string[];
  failed: string[];
}

/**
 * Intenta enviar todos los pedidos encolados.
 * `sender` hace el envío real (p. ej. supabase.from("orders").insert(...))
 * y lanza si falla. Los enviados se eliminan de la cola.
 */
export async function flushPendingOrders(
  sender: (payload: Record<string, unknown>) => Promise<void>,
): Promise<FlushResult> {
  const result: FlushResult = { sent: [], failed: [] };
  const orders = await getPendingOrders();
  for (const order of orders) {
    try {
      await sender(order.payload);
      await removePendingOrder(order.id);
      result.sent.push(order.id);
    } catch {
      result.failed.push(order.id);
    }
  }
  return result;
}

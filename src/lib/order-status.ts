// Estados de pedido: etiquetas en español, línea de tiempo y utilidades.
// El enum en BD es public.order_status:
// pending, confirmed, preparing, shipped, delivered, cancelled.

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "En preparación",
  shipped: "Enviado/Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** Pasos de la línea de tiempo (cancelled no tiene línea de tiempo). */
export const ORDER_TIMELINE_STEPS: Exclude<OrderStatus, "cancelled">[] = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
];

/** Etiqueta en español de un estado; si es desconocido devuelve el valor tal cual. */
export function orderStatusLabel(status: string): string {
  return (ORDER_STATUS_LABELS as Record<string, string>)[status] ?? status;
}

/**
 * Índice del estado dentro de la línea de tiempo.
 * Devuelve -1 si el estado no forma parte de ella (p. ej. "cancelled").
 */
export function orderStatusStepIndex(status: string): number {
  return ORDER_TIMELINE_STEPS.indexOf(
    status as Exclude<OrderStatus, "cancelled">
  );
}

/**
 * Id corto para mostrarle al cliente: primeros 8 caracteres del UUID en mayúsculas.
 * Ej: "a1b2c3d4-e5f6-..." -> "A1B2C3D4".
 */
export function shortOrderId(id: string): string {
  return String(id ?? "").slice(0, 8).toUpperCase();
}

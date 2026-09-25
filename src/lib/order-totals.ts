/**
 * Lógica pura del formulario de pedido de la calculadora pública (/calcular-envio).
 * Sin dependencias de React ni de Supabase: todo es testeable con vitest.
 *
 * REGLA DE ORO DE MEL: nunca mezclar monedas en una sola cifra sin aclararlo.
 * - Productos en USD → "Productos: X USD + Mensajería: Y CUP" (por separado).
 * - Todo en CUP → se puede sumar, pero diferenciando cada parte.
 */

export type MoneyCurrency = "USD" | "CUP";

/** Normaliza cualquier valor a "USD" o "CUP" (por defecto USD). */
export function normalizeCurrency(value: unknown): MoneyCurrency {
  const v = String(value ?? "").trim().toUpperCase();
  return v === "CUP" ? "CUP" : "USD";
}

/** Formatea un importe: "$55.00 USD" o "2,050 CUP". */
export function formatMoney(amount: number, currency: MoneyCurrency): string {
  if (currency === "USD") {
    return `$${Number(amount || 0).toFixed(2)} USD`;
  }
  const n = Math.round(Number(amount || 0));
  return `${new Intl.NumberFormat("es-CU", { maximumFractionDigits: 0 }).format(n)} CUP`;
}

export interface OrderLineInput {
  name: string;
  unitPrice: number;
  currency: MoneyCurrency;
  quantity: number;
}

export interface OrderLine extends OrderLineInput {
  lineTotal: number;
}

export interface OrderTotals {
  lines: OrderLine[];
  subtotalUsd: number;
  subtotalCup: number;
  deliveryKm: number;
  pricePerKm: number;
  deliveryCup: number;
  hasUsdItems: boolean;
  hasCupItems: boolean;
  /** Suma única solo cuando TODO (productos + mensajería) está en CUP; null si hay USD. */
  totalCupAll: number | null;
}

export function computeOrderTotals(
  items: OrderLineInput[],
  deliveryKm: number,
  pricePerKm: number,
): OrderTotals {
  const lines: OrderLine[] = (items ?? [])
    .filter((it) => it && Number(it.quantity) > 0 && Number(it.unitPrice) >= 0)
    .map((it) => ({
      name: String(it.name ?? ""),
      unitPrice: Number(it.unitPrice) || 0,
      currency: normalizeCurrency(it.currency),
      quantity: Math.floor(Number(it.quantity)) || 0,
      lineTotal: (Number(it.unitPrice) || 0) * (Math.floor(Number(it.quantity)) || 0),
    }))
    .filter((l) => l.quantity > 0);

  const subtotalUsd = lines
    .filter((l) => l.currency === "USD")
    .reduce((acc, l) => acc + l.lineTotal, 0);
  const subtotalCup = lines
    .filter((l) => l.currency === "CUP")
    .reduce((acc, l) => acc + l.lineTotal, 0);

  const km = Math.max(0, Number(deliveryKm) || 0);
  const rate = Math.max(0, Number(pricePerKm) || 0);
  const deliveryCup = Math.round(km * rate);

  const hasUsdItems = lines.some((l) => l.currency === "USD");
  const hasCupItems = lines.some((l) => l.currency === "CUP");

  return {
    lines,
    subtotalUsd,
    subtotalCup,
    deliveryKm: km,
    pricePerKm: rate,
    deliveryCup,
    hasUsdItems,
    hasCupItems,
    totalCupAll: hasUsdItems ? null : Math.round(subtotalCup + deliveryCup),
  };
}

export interface TotalsPresentation {
  productsLine: string;
  deliveryLine: string;
  totalLine: string;
}

/**
 * Desglose legible de los totales, listo para mostrar en la UI y en el
 * mensaje de WhatsApp. Nunca mezcla monedas sin aclararlo.
 */
export function presentTotals(t: OrderTotals): TotalsPresentation {
  const productParts: string[] = [];
  if (t.hasUsdItems) productParts.push(formatMoney(t.subtotalUsd, "USD"));
  if (t.hasCupItems) productParts.push(formatMoney(t.subtotalCup, "CUP"));
  const productsLine = productParts.length > 0 ? productParts.join(" + ") : formatMoney(0, "CUP");

  const deliveryLine = `${formatMoney(t.deliveryCup, "CUP")} (${t.deliveryKm.toFixed(1)} km × ${t.pricePerKm} CUP/km)`;

  let totalLine: string;
  if (t.hasUsdItems && !t.hasCupItems) {
    // Productos en USD: todo por separado.
    totalLine = `${formatMoney(t.subtotalUsd, "USD")} + ${formatMoney(t.deliveryCup, "CUP")}`;
  } else if (!t.hasUsdItems && t.hasCupItems) {
    // Todo en CUP: se suma, pero diferenciando cada parte.
    totalLine = `${formatMoney(t.totalCupAll ?? 0, "CUP")} (productos ${formatMoney(t.subtotalCup, "CUP")} + mensajería ${formatMoney(t.deliveryCup, "CUP")})`;
  } else if (t.hasUsdItems && t.hasCupItems) {
    // Mixto: USD por separado; los CUP sí se suman, aclarado.
    const cupSum = t.subtotalCup + t.deliveryCup;
    totalLine = `${formatMoney(t.subtotalUsd, "USD")} + ${formatMoney(cupSum, "CUP")} (productos en CUP ${formatMoney(t.subtotalCup, "CUP")} + mensajería ${formatMoney(t.deliveryCup, "CUP")})`;
  } else {
    totalLine = formatMoney(t.deliveryCup, "CUP");
  }

  return { productsLine, deliveryLine, totalLine };
}

// ---------------------------------------------------------------------------
// Validación del formulario
// ---------------------------------------------------------------------------

export interface DeliveryOrderFormFields {
  customerName: string;
  customerPhone: string;
  altPhone?: string;
  street: string;
  houseNumber: string;
  betweenStreets?: string;
  municipality?: string;
  reference?: string;
}

export interface FormValidation {
  ok: boolean;
  errors: Record<string, string>;
}

/**
 * Valida los datos del cliente. La dirección escrita mínima es calle + número.
 * `itemCount` es la cantidad de líneas de producto agregadas.
 */
export function validateDeliveryOrderForm(
  f: DeliveryOrderFormFields,
  itemCount: number,
): FormValidation {
  const errors: Record<string, string> = {};

  if (!f.customerName.trim() || f.customerName.trim().length < 2) {
    errors.customerName = "Escribe tu nombre completo.";
  }
  const phoneDigits = f.customerPhone.replace(/\D/g, "");
  if (phoneDigits.length < 6) {
    errors.customerPhone = "Escribe tu número de teléfono (al menos 6 dígitos).";
  }
  if (f.altPhone && f.altPhone.trim()) {
    const altDigits = f.altPhone.replace(/\D/g, "");
    if (altDigits.length < 6) {
      errors.altPhone = "El teléfono alternativo debe tener al menos 6 dígitos.";
    }
  }
  if (!f.street.trim()) {
    errors.street = "Escribe la calle de tu dirección.";
  }
  if (!f.houseNumber.trim()) {
    errors.houseNumber = "Escribe el número de tu casa.";
  }
  if (!itemCount || itemCount < 1) {
    errors.items = "Agrega al menos un producto al pedido.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

// ---------------------------------------------------------------------------
// Mensaje de WhatsApp
// ---------------------------------------------------------------------------

export interface DeliveryOrderMessageData extends DeliveryOrderFormFields {
  destLat: number;
  destLng: number;
  stopLat?: number | null;
  stopLng?: number | null;
  originLabel: string;
  items: OrderLineInput[];
  deliveryKm: number;
  pricePerKm: number;
}

/** Construye el mensaje pre-rellenado del pedido para WhatsApp. */
export function buildDeliveryOrderMessage(d: DeliveryOrderMessageData): string {
  const totals = computeOrderTotals(d.items, d.deliveryKm, d.pricePerKm);
  const p = presentTotals(totals);
  const L: string[] = [];

  L.push("🛵 *NUEVO PEDIDO — NEOCHARGE* (calculadora web)");
  L.push("");
  L.push(`👤 *Cliente:* ${d.customerName.trim()}`);
  L.push(`📱 *Teléfono:* ${d.customerPhone.trim()}`);
  if (d.altPhone && d.altPhone.trim()) {
    L.push(`📱 *Tel. alternativo:* ${d.altPhone.trim()} (por si no hay cobertura)`);
  }
  L.push("");
  L.push("📍 *Dirección:*");
  L.push(`Calle: ${d.street.trim()}`);
  L.push(`No.: ${d.houseNumber.trim()}`);
  if (d.betweenStreets && d.betweenStreets.trim()) L.push(`Entre: ${d.betweenStreets.trim()}`);
  if (d.municipality && d.municipality.trim()) L.push(`Municipio: ${d.municipality.trim()}`);
  if (d.reference && d.reference.trim()) L.push(`Referencia: ${d.reference.trim()}`);
  L.push(`🗺️ *Punto en el mapa:* ${d.destLat.toFixed(6)}, ${d.destLng.toFixed(6)}`);
  if (d.stopLat != null && d.stopLng != null) {
    L.push(`🛑 *Parada intermedia:* ${Number(d.stopLat).toFixed(6)}, ${Number(d.stopLng).toFixed(6)}`);
  }
  L.push("");
  L.push(`📏 *Distancia:* ${totals.deliveryKm.toFixed(1)} km (desde ${d.originLabel})`);
  L.push("");
  L.push("*PRODUCTOS:*");
  totals.lines.forEach((line, i) => {
    L.push(`${i + 1}. ${line.name}`);
    L.push(
      `   ${line.quantity} × ${formatMoney(line.unitPrice, line.currency)} = ${formatMoney(line.lineTotal, line.currency)}`,
    );
  });
  L.push("");
  L.push(`💰 *Productos:* ${p.productsLine}`);
  L.push(`🚚 *Mensajería:* ${p.deliveryLine}`);
  L.push(`💵 *TOTAL:* ${p.totalLine}`);
  L.push("");
  L.push("Por favor confirmen mi pedido. ¡Gracias!");

  return L.join("\n");
}

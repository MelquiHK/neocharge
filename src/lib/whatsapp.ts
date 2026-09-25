import type { CartItem } from "@/hooks/use-cart";

export const STORE_PHONE = "+5363180910";

interface CheckoutPayload {
  items: CartItem[];
  total: number;
  paymentCurrency: "USD" | "CUP";
  customerName: string;
  customerPhone: string;
  deliveryMethod: "pickup" | "delivery";
  customerAddress?: string;
  notes?: string;
  shippingUSD?: number;
  shippingCUP?: number;
  subtotalUSD?: number | null;
  subtotalCUP?: number | null;
}

export function buildWhatsAppMessage(p: CheckoutPayload): string {
  const lines: string[] = [];
  lines.push("🛒 *NUEVO PEDIDO — NEOCHARGE*");
  lines.push("");
  lines.push(`👤 *Cliente:* ${p.customerName}`);
  lines.push(`📱 *Teléfono:* ${p.customerPhone}`);
  lines.push(`🚚 *Entrega:* ${p.deliveryMethod === "delivery" ? "Mensajería a domicilio" : "Recogida en tienda"}`);
  if (p.deliveryMethod === "delivery" && p.customerAddress) {
    lines.push(`📍 *Dirección:* ${p.customerAddress}`);
  }
  if (p.notes) lines.push(`📝 *Notas:* ${p.notes}`);
  lines.push("");
  lines.push("*PRODUCTOS:*");
  p.items.forEach((it, i) => {
    // Sin tasa no se inventa conversión: se muestra el precio nativo disponible.
    const usd = it.displayPriceUSD != null ? it.displayPriceUSD * it.quantity : null;
    const cup = it.displayPriceCUP != null ? it.displayPriceCUP * it.quantity : null;
    const usdLabel = usd != null ? `$${usd.toFixed(2)} USD` : null;
    const cupLabel = cup != null ? `${Math.round(cup)} CUP` : null;
    const itemLabel =
      p.paymentCurrency === "USD" ? (usdLabel ?? cupLabel ?? "—") : (cupLabel ?? usdLabel ?? "—");

    lines.push(`${i + 1}. ${it.name}`);
    lines.push(`   • Cantidad: ${it.quantity}`);
    lines.push(`   • Subtotal: ${itemLabel}`);
  });

  // Sin tasa no se inventan conversiones: las partes desconocidas se omiten,
  // nunca se muestran como 0.
  const subtotalUsd = p.subtotalUSD ?? null;
  const subtotalCup = p.subtotalCUP ?? null;
  const shippingUsd = p.shippingUSD ?? 0;
  const shippingCup = p.shippingCUP ?? 0;
  const paymentLabel = p.paymentCurrency === "USD" ? "USD" : "CUP";

  const productoParts: string[] = [];
  if (subtotalUsd != null) productoParts.push(formatCurrencyAmount(subtotalUsd, "USD"));
  if (subtotalCup != null) productoParts.push(formatCurrencyAmount(subtotalCup, "CUP"));
  lines.push("");
  lines.push(`💰 *PRODUCTO:* ${productoParts.join(" / ") || "—"}`);
  if (p.deliveryMethod === "delivery" && (shippingCup > 0 || shippingUsd > 0)) {
    lines.push(`🚚 *MENSAJERÍA:* ${formatCurrencyAmount(shippingCup, "CUP")}`);
  } else if (p.deliveryMethod === "pickup") {
    lines.push("🏪 *RECOGIDA EN LOCAL*");
  }
  const totalPayUsd = subtotalUsd != null ? subtotalUsd + shippingUsd : null;
  const totalPayCup = subtotalCup != null ? subtotalCup + shippingCup : null;
  const totalPay = p.paymentCurrency === "USD" ? totalPayUsd : totalPayCup;
  lines.push(`💵 *TOTAL A PAGAR EN ${paymentLabel}:* ${totalPay != null ? formatCurrencyAmount(totalPay, p.paymentCurrency) : "—"}`);
  if (p.paymentCurrency === "USD") {
    if (totalPayCup != null) lines.push(`💶 *TOTAL EN CUP:* ${formatCurrencyAmount(totalPayCup, "CUP")}`);
  } else {
    if (totalPayUsd != null) lines.push(`💵 *TOTAL EN USD:* ${formatCurrencyAmount(totalPayUsd, "USD")}`);
  }
  lines.push("");
  lines.push(`⏰ ${new Date().toLocaleString("es-CU")}`);
  lines.push("");
  lines.push("Por favor confirmen mi pedido. ¡Gracias!");
  return lines.join("\n");
}

function formatCurrencyAmount(value: number, currency: "USD" | "CUP") {
  return currency === "USD" ? `$${Number(value || 0).toFixed(2)} USD` : `${Math.round(Number(value || 0))} CUP`;
}

export function getWhatsAppLink(message: string, phone = STORE_PHONE): string {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

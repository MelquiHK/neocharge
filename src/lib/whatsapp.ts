import type { CartItem } from "@/contexts/CartContext";

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
  subtotalUSD?: number;
  subtotalCUP?: number;
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
    const itemSubtotal = p.paymentCurrency === "USD" 
      ? (it.displayPriceUSD || 0) * it.quantity 
      : (it.displayPriceCUP || 0) * it.quantity;
    
    lines.push(`${i + 1}. ${it.name}`);
    lines.push(`   • Cantidad: ${it.quantity}`);
    lines.push(`   • Subtotal: ${p.paymentCurrency === "USD" ? `$${itemSubtotal.toFixed(2)} USD` : `${Math.round(itemSubtotal)} CUP`}`);
  });
  const subtotalUsd = p.subtotalUSD ?? p.total;
  const subtotalCup = p.subtotalCUP ?? 0;
  const shippingUsd = p.shippingUSD ?? 0;
  const shippingCup = p.shippingCUP ?? 0;
  lines.push("");
  lines.push(`💰 *PRODUCTO:* ${formatCurrencyAmount(subtotalUsd, "USD")} / ${formatCurrencyAmount(subtotalCup, "CUP")}`);
  lines.push(`🚚 *ENVÍO:* ${formatCurrencyAmount(shippingUsd, "USD")} / ${formatCurrencyAmount(shippingCup, "CUP")}`);
  lines.push(`💵 *TOTAL:* ${formatCurrencyAmount(subtotalUsd + shippingUsd, "USD")} / ${formatCurrencyAmount(subtotalCup + shippingCup, "CUP")}`);
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

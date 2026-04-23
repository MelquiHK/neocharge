// Utility para generar mensajes de WhatsApp
export function generateWhatsAppMessage(cartItems: any[], total: number, customerPhone?: string, customerName?: string): string {
  let message = "🛒 *NUEVO PEDIDO DESDE NEOCHARGE*\n\n"
  
  if (customerName) {
    message += `👤 Cliente: ${customerName}\n`
  }
  if (customerPhone) {
    message += `📱 Teléfono: ${customerPhone}\n`
  }
  
  message += `\n*PRODUCTOS:*\n`
  
  cartItems.forEach((item, index) => {
    message += `${index + 1}. ${item.name}\n`
    message += `   Cantidad: ${item.quantity}\n`
    message += `   Precio: $${(item.price * item.quantity).toFixed(2)}\n\n`
  })
  
  message += `\n*TOTAL: $${total.toFixed(2)}*\n\n`
  message += `⏰ ${new Date().toLocaleString('es-CU')}\n`
  message += `\n¿Necesitas ayuda? Contáctame para confirmar tu compra.`
  
  return message
}

export function getWhatsAppLink(phoneNumber: string, message: string): string {
  // Remove any non-digit characters from phone
  const cleanPhone = phoneNumber.replace(/\D/g, '')
  // Add country code if not present (Cuba +53)
  const fullPhone = cleanPhone.startsWith('53') ? cleanPhone : `53${cleanPhone}`
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${fullPhone}?text=${encodedMessage}`
}

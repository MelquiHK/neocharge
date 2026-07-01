import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage } from "./whatsapp";

describe("buildWhatsAppMessage", () => {
  it("keeps the USD total separate from CUP shipping in the receipt", () => {
    const message = buildWhatsAppMessage({
      items: [
        {
          id: "1",
          name: "Ventilador Recargable X11",
          quantity: 1,
          price: 70,
          displayPriceUSD: 70,
          displayPriceCUP: 3500,
          image: "",
          category: "chargers",
        },
      ] as any,
      total: 70,
      paymentCurrency: "USD",
      customerName: "Melquisedec",
      customerPhone: "+53 55555555",
      deliveryMethod: "delivery",
      customerAddress: "Calle 1",
      shippingUSD: 0,
      shippingCUP: 3300,
      subtotalUSD: 70,
      subtotalCUP: 3500,
    });

    expect(message).toContain("*TOTAL A PAGAR EN USD:* $70.00 USD");
    expect(message).toContain("*MENSAJERÍA:* 3300 CUP");
    expect(message).not.toContain("*TOTAL A PAGAR EN USD:* $3370.00");
  });
});

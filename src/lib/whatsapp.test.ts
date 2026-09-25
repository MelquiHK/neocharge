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
          slug: "ventilador-recargable-x11",
        },
      ],
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

describe("buildWhatsAppMessage sin tasa", () => {
  it("omite las conversiones desconocidas en vez de mostrar 0", () => {
    const message = buildWhatsAppMessage({
      items: [
        {
          id: "1",
          name: "Cargador 72V 5A",
          quantity: 1,
          price: 55,
          displayPriceUSD: 55,
          displayPriceCUP: null,
          image: "",
          slug: "cargador-72v-5a",
        },
      ],
      total: 55,
      paymentCurrency: "USD",
      customerName: "Melquisedec",
      customerPhone: "+53 55555555",
      deliveryMethod: "pickup",
      shippingUSD: 0,
      shippingCUP: 0,
      subtotalUSD: 55,
      subtotalCUP: null,
    });

    expect(message).toContain("*TOTAL A PAGAR EN USD:* $55.00 USD");
    expect(message).toContain("💰 *PRODUCTO:* $55.00 USD");
    expect(message).not.toContain("0 CUP");
    expect(message).not.toContain("TOTAL EN CUP");
  });
});

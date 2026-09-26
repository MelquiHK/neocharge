import {
  computeSalesTotalsBySeller,
  parseSaleDetails,
  buildSaleDetails,
  toCUP,
  getSaleOwed,
  computeOwnerSalesSummary,
} from "@/lib/sales";

describe("computeSalesTotalsBySeller", () => {
  it("computes totals and groups by seller", () => {
    const sales = [
      { id: "1", seller_user_id: "u1", seller_name: "Ana", price: 100, currency: "USD", is_paid: false },
      { id: "2", seller_user_id: "u1", seller_name: "Ana", price: 50, currency: "USD", is_paid: true },
      { id: "3", seller_user_id: "u2", seller_name: "Luis", price: 200, currency: "CUP", is_paid: false },
    ];

    const totals = computeSalesTotalsBySeller(sales);
    expect(totals.totalCount).toBe(3);
    expect(totals.totalUSD).toBe(150);
    expect(totals.totalCUP).toBe(200);
    expect(totals.bySeller.length).toBe(2);
    const ana = totals.bySeller.find((s) => s.seller_user_id === "u1");
    expect(ana?.count).toBe(2);
    expect(ana?.totalUSD).toBe(150);
  });
});

describe("parseSaleDetails", () => {
  it("parses JSON meta", () => {
    const sale = {
      sale_details: JSON.stringify({
        base_price: 50,
        base_currency: "USD",
        markup_amount: 10,
        is_owner_sale: false,
        detail_text: "Entregado en Vedado",
      }),
    };
    expect(parseSaleDetails(sale)).toEqual({
      basePrice: 50,
      baseCurrency: "USD",
      markupAmount: 10,
      isOwnerSale: false,
      detailText: "Entregado en Vedado",
    });
  });

  it("preserves legacy free text as detailText", () => {
    const sale = { sale_details: "Venta de prueba, cliente llamó por WhatsApp" };
    const meta = parseSaleDetails(sale);
    expect(meta.detailText).toBe("Venta de prueba, cliente llamó por WhatsApp");
    expect(meta.basePrice).toBeNull();
    expect(meta.isOwnerSale).toBe(false);
  });

  it("returns empty meta for null/blank", () => {
    expect(parseSaleDetails({ sale_details: null })).toEqual({
      basePrice: null,
      baseCurrency: null,
      markupAmount: null,
      isOwnerSale: false,
      detailText: null,
    });
    expect(parseSaleDetails({ sale_details: "   " }).detailText).toBeNull();
  });
});

describe("buildSaleDetails", () => {
  it("round-trips through parseSaleDetails", () => {
    const json = buildSaleDetails({
      basePrice: 55,
      baseCurrency: "USD",
      markupAmount: 5,
      isOwnerSale: true,
      detailText: "nota",
    });
    expect(parseSaleDetails({ sale_details: json })).toEqual({
      basePrice: 55,
      baseCurrency: "USD",
      markupAmount: 5,
      isOwnerSale: true,
      detailText: "nota",
    });
  });

  it("returns empty string when there is no data", () => {
    expect(buildSaleDetails({})).toBe("");
  });
});

describe("toCUP", () => {
  it("converts USD with rate", () => {
    expect(toCUP(10, "USD", 730)).toBe(7300);
  });
  it("keeps CUP as-is", () => {
    expect(toCUP(2000, "CUP", 730)).toBe(2000);
  });
  it("does not invent a conversion with an invalid rate", () => {
    expect(toCUP(10, "USD", 0)).toBe(10);
    expect(toCUP(10, "USD", NaN)).toBe(10);
  });
});

describe("getSaleOwed", () => {
  const base = {
    id: "1",
    currency: "USD",
    commission_amount: 2000,
    commission_currency: "CUP",
    sale_details: buildSaleDetails({ basePrice: 50, baseCurrency: "USD", markupAmount: 10 }),
  };
  it("pays only the markup when it is positive (not commission + markup)", () => {
    // markup 10 USD * 730 = 7300 ; la comisión de 2000 NO se suma
    expect(getSaleOwed(base, 730)).toBe(7300);
  });
  it("pays the commission when markup is zero", () => {
    const sale = { ...base, sale_details: buildSaleDetails({ markupAmount: 0 }) };
    expect(getSaleOwed(sale, 730)).toBe(2000);
  });
  it("ignores negative markup", () => {
    const sale = { ...base, sale_details: buildSaleDetails({ markupAmount: -5 }) };
    expect(getSaleOwed(sale, 730)).toBe(2000);
  });
  it("returns 0 for owner sales", () => {
    const sale = { ...base, sale_details: buildSaleDetails({ isOwnerSale: true, markupAmount: 10 }) };
    expect(getSaleOwed(sale, 730)).toBe(0);
  });
  it("normalizes USD commissions too", () => {
    const sale = { ...base, commission_amount: 5, commission_currency: "USD", sale_details: "" };
    expect(getSaleOwed(sale, 700)).toBe(3500);
  });
});

describe("computeOwnerSalesSummary", () => {
  it("groups by seller with owed/paid/pending in CUP", () => {
    const sales = [
      {
        id: "1", seller_user_id: "u1", seller_name: "Ana", price: 60, currency: "USD",
        commission_amount: 2000, commission_currency: "CUP",
        commission_paid_amount: 2000, is_paid: false,
        sale_details: buildSaleDetails({ basePrice: 50, baseCurrency: "USD", markupAmount: 10 }),
      },
      {
        id: "2", seller_user_id: "u1", seller_name: "Ana", price: 55, currency: "USD",
        commission_amount: 2000, commission_currency: "CUP",
        sale_details: buildSaleDetails({ basePrice: 55, baseCurrency: "USD", markupAmount: 0 }),
      },
      {
        id: "3", seller_user_id: "u2", seller_name: "Mel", price: 100, currency: "USD",
        commission_amount: 0, commission_currency: "CUP",
        sale_details: buildSaleDetails({ isOwnerSale: true }),
      },
    ];
    const s = computeOwnerSalesSummary(sales, 700);
    expect(s.count).toBe(3);
    expect(s.totalUSD).toBe(215);

    const ana = s.sellers.find((x) => x.key === "u1")!;
    // venta 1: markup 10*700 = 7000 (solo markup, sin comisión)
    // venta 2: markup 0 → comisión 2000
    expect(ana.owedCUP).toBe(9000);
    expect(ana.paidCUP).toBe(2000);
    expect(ana.pendingCUP).toBe(7000);
    expect(ana.markupCUP).toBe(7000);
    expect(ana.commissionCUP).toBe(2000);

    const mel = s.sellers.find((x) => x.key === "u2")!;
    expect(mel.isOwner).toBe(true);
    expect(mel.owedCUP).toBe(0);
    expect(mel.pendingCUP).toBe(0);

    expect(s.owedCUP).toBe(9000);
    expect(s.pendingCUP).toBe(7000);
    expect(s.commissionCUP).toBe(2000);
    expect(s.markupCUP).toBe(7000);
  });

  it("treats legacy is_paid rows as fully paid", () => {
    const sales = [
      { id: "1", seller_user_id: "u1", seller_name: "Ana", price: 60, currency: "USD", commission_amount: 2000, commission_currency: "CUP", is_paid: true },
    ];
    const s = computeOwnerSalesSummary(sales, 700);
    expect(s.sellers[0].paidCUP).toBe(2000);
    expect(s.sellers[0].pendingCUP).toBe(0);
  });
});

import { computeSalesTotalsBySeller } from "@/lib/sales";

describe("computeSalesTotalsBySeller", () => {
  it("computes totals and groups by seller", () => {
    const sales = [
      { id: "1", seller_user_id: "u1", seller_name: "Ana", price: 100, currency: "USD", is_paid: false },
      { id: "2", seller_user_id: "u1", seller_name: "Ana", price: 50, currency: "USD", is_paid: true },
      { id: "3", seller_user_id: "u2", seller_name: "Luis", price: 200, currency: "CUP", is_paid: false },
    ];

    const totals = computeSalesTotalsBySeller(sales as any);
    expect(totals.totalCount).toBe(3);
    expect(totals.totalUSD).toBe(150);
    expect(totals.totalCUP).toBe(200);
    expect(totals.bySeller.length).toBe(2);
    const ana = totals.bySeller.find((s: any) => s.seller_user_id === "u1");
    expect(ana.count).toBe(2);
    expect(ana.totalUSD).toBe(150);
  });
});

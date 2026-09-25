export interface SellerSale {
  id: string;
  seller_user_id?: string | null;
  seller_name?: string | null;
  product_name?: string | null;
  price?: number | string | null;
  price_cup?: number | string | null;
  currency?: string | null;
  commission_amount?: number | string | null;
  commission_paid_amount?: number | string | null;
  is_paid?: boolean | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  location_name?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface SellerTotals {
  seller_user_id?: string | null;
  seller_name?: string | null;
  count: number;
  totalUSD: number;
  totalCUP: number;
  amountOwedUSD: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
}

export function computeSalesTotalsBySeller(sales: SellerSale[]) {
  const totals = {
    totalCount: 0,
    totalUSD: 0,
    totalCUP: 0,
    bySeller: [] as Array<SellerTotals>,
  };

  const map = new Map<string, SellerTotals>();
  for (const s of sales ?? []) {
    totals.totalCount += 1;
    const price = Number(s.price ?? 0);
    if (s.currency === "CUP") totals.totalCUP += price; else totals.totalUSD += price;

    const key = s.seller_user_id ?? s.seller_name ?? "unknown";
    const entry = map.get(key) ?? { 
      seller_user_id: s.seller_user_id, 
      seller_name: s.seller_name, 
      count: 0, 
      totalUSD: 0, 
      totalCUP: 0, 
      amountOwedUSD: 0,
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0
    };
    entry.count += 1;
    if (s.currency === "CUP") entry.totalCUP += price; else entry.totalUSD += price;
    
    // Original amountOwedUSD calculation (keeping for compatibility)
    if (!s.is_paid) entry.amountOwedUSD += (s.currency === "CUP" ? 0 : price);
    
    // New commission tracking
    const commission = Number(s.commission_amount ?? 0);
    const paid = Number(s.commission_paid_amount ?? (s.is_paid ? commission : 0));
    
    entry.totalCommission += commission;
    entry.paidCommission += paid;
    entry.pendingCommission += (commission - paid);
    
    map.set(key, entry);
  }

  totals.bySeller = Array.from(map.values()).sort((a, b) => (b.totalUSD + b.totalCUP) - (a.totalUSD + a.totalCUP));
  return totals;
}

export default computeSalesTotalsBySeller;

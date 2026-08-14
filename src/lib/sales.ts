export function computeSalesTotalsBySeller(sales: any[]) {
  const totals = {
    totalCount: 0,
    totalUSD: 0,
    totalCUP: 0,
    bySeller: [] as Array<any>,
  };

  const map = new Map<string, any>();
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

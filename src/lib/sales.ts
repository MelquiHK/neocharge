export interface SellerSale {
  id: string;
  seller_user_id?: string | null;
  seller_name?: string | null;
  product_name?: string | null;
  price?: number | string | null;
  price_cup?: number | string | null;
  currency?: string | null;
  sale_details?: string | null;
  commission_amount?: number | string | null;
  commission_currency?: string | null;
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

/* ------------------------------------------------------------------ */
/*  Modelo de comisiones y caja (decidido por Mel, 2026-09)             */
/*                                                                     */
/*  NO es comisión + markup: es UNA O LA OTRA.                          */
/*  - Si el gestor vende AL precio base → gana la comisión             */
/*    (editable, default 2000 CUP).                                    */
/*  - Si vende POR ENCIMA del precio base ("le pone dinero por         */
/*    arriba") → se queda SOLO con la diferencia (markup) y Mel NO     */
/*    le debe la comisión.                                             */
/*  Fórmula por venta: owed = markup > 0 ? markup : commission         */
/*  donde markup = max(0, precio_venta − precio_base).                  */
/*  - Las ventas del dueño (Mel) no generan deuda: comisión 0.          */
/*  - Los campos nuevos viven en `sale_details` como JSON (sin DDL):    */
/*    { base_price, base_currency, markup_amount, is_owner_sale,        */
/*      detail_text }. El texto libre anterior se conserva intacto.     */
/* ------------------------------------------------------------------ */

export interface SaleDetailMeta {
  /** Precio base del producto al momento de la venta (en baseCurrency). */
  basePrice: number | null;
  /** Moneda del precio base ("USD" | "CUP"). */
  baseCurrency: string | null;
  /** precio_venta − precio_base, en la moneda de la venta. Puede ser ≤ 0. */
  markupAmount: number | null;
  /** true cuando la venta la hizo Mel (el dueño): no genera deuda. */
  isOwnerSale: boolean;
  /** Texto libre del detalle (nuevo o preservado de valores no-JSON). */
  detailText: string | null;
}

const EMPTY_META: SaleDetailMeta = {
  basePrice: null,
  baseCurrency: null,
  markupAmount: null,
  isOwnerSale: false,
  detailText: null,
};

function toNullableNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lee `sale_details`. Si es JSON con nuestras claves, las extrae;
 * si es texto libre anterior (no-JSON), lo conserva en `detailText`
 * para no perder datos.
 */
export function parseSaleDetails(sale: Pick<SellerSale, "sale_details">): SaleDetailMeta {
  const raw = sale.sale_details;
  if (raw == null || String(raw).trim() === "") return { ...EMPTY_META };
  const text = String(raw).trim();
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const detailText =
        typeof parsed.detail_text === "string" && parsed.detail_text.trim() !== ""
          ? parsed.detail_text
          : null;
      return {
        basePrice: toNullableNumber(parsed.base_price),
        baseCurrency: typeof parsed.base_currency === "string" ? parsed.base_currency : null,
        markupAmount: toNullableNumber(parsed.markup_amount),
        isOwnerSale: parsed.is_owner_sale === true,
        detailText,
      };
    }
  } catch {
    // No es JSON: se trata como texto libre anterior.
  }
  return { ...EMPTY_META, detailText: text };
}

/** Serializa la meta a JSON para guardar en `sale_details`. Vacío → "". */
export function buildSaleDetails(meta: Partial<SaleDetailMeta>): string {
  const full: SaleDetailMeta = { ...EMPTY_META, ...meta };
  const text = (full.detailText ?? "").trim();
  const hasData =
    full.basePrice != null ||
    full.baseCurrency != null ||
    full.markupAmount != null ||
    full.isOwnerSale ||
    text !== "";
  if (!hasData) return "";
  return JSON.stringify({
    base_price: full.basePrice,
    base_currency: full.baseCurrency,
    markup_amount: full.markupAmount,
    is_owner_sale: full.isOwnerSale,
    detail_text: text !== "" ? text : null,
  });
}

/**
 * Normaliza un monto a CUP. Si la tasa no es válida (> 0), devuelve el
 * monto sin cambios en vez de inventar una conversión.
 */
export function toCUP(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
  rateCUPperUSD: number,
): number {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return 0;
  if ((currency ?? "").toUpperCase() === "USD") {
    if (!Number.isFinite(rateCUPperUSD) || rateCUPperUSD <= 0) return n;
    return n * rateCUPperUSD;
  }
  return n;
}

/**
 * Lo que Mel le debe al gestor por esta venta, en CUP.
 * Es UNA O LA OTRA: si hay markup positivo se paga solo el markup;
 * si no, se paga la comisión configurada (todo normalizado a CUP).
 * Las ventas del dueño devuelven 0 (no se debe nada a sí mismo).
 */
export function getSaleOwed(sale: SellerSale, rateCUPperUSD: number): number {
  const meta = parseSaleDetails(sale);
  if (meta.isOwnerSale) return 0;
  const markup = Math.max(
    0,
    toCUP(meta.markupAmount ?? 0, sale.currency ?? "USD", rateCUPperUSD),
  );
  if (markup > 0) return markup;
  return toCUP(sale.commission_amount, sale.commission_currency ?? "CUP", rateCUPperUSD);
}

export interface OwnerSellerSummary {
  key: string;
  sellerName: string;
  /** true si al menos una venta del grupo es del dueño. */
  isOwner: boolean;
  count: number;
  totalUSD: number;
  totalCUP: number;
  /** Comisión total normalizada a CUP (solo cuenta cuando aplica). */
  commissionCUP: number;
  /** Markup positivo total normalizado a CUP. */
  markupCUP: number;
  /** Total que Mel debe al gestor (markup o comisión por venta), en CUP. */
  owedCUP: number;
  /** Pagado al gestor, en CUP. */
  paidCUP: number;
  /** Pendiente de pago al gestor, en CUP (≥ 0). */
  pendingCUP: number;
}

export interface OwnerSalesSummary {
  sellers: OwnerSellerSummary[];
  count: number;
  totalUSD: number;
  totalCUP: number;
  commissionCUP: number;
  markupCUP: number;
  owedCUP: number;
  paidCUP: number;
  pendingCUP: number;
}

function emptySellerSummary(key: string, sellerName: string): OwnerSellerSummary {
  return {
    key,
    sellerName,
    isOwner: false,
    count: 0,
    totalUSD: 0,
    totalCUP: 0,
    commissionCUP: 0,
    markupCUP: 0,
    owedCUP: 0,
    paidCUP: 0,
    pendingCUP: 0,
  };
}

/**
 * Fuente única de verdad para ventas/comisiones/caja.
 * Agrupa por gestor y normaliza todo a CUP con la tasa dada.
 * Las ventas del dueño suman a los totales vendidos pero no generan deuda.
 */
export function computeOwnerSalesSummary(
  sales: SellerSale[],
  rateCUPperUSD: number,
): OwnerSalesSummary {
  const summary: OwnerSalesSummary = {
    sellers: [],
    count: 0,
    totalUSD: 0,
    totalCUP: 0,
    commissionCUP: 0,
    markupCUP: 0,
    owedCUP: 0,
    paidCUP: 0,
    pendingCUP: 0,
  };
  const map = new Map<string, OwnerSellerSummary>();

  for (const s of sales ?? []) {
    const price = Number(s.price ?? 0);
    const safePrice = Number.isFinite(price) ? price : 0;
    const isUSD = (s.currency ?? "").toUpperCase() !== "CUP";

    summary.count += 1;
    if (isUSD) summary.totalUSD += safePrice;
    else summary.totalCUP += safePrice;

    const key = s.seller_user_id ?? s.seller_name ?? "unknown";
    let entry = map.get(key);
    if (!entry) {
      entry = emptySellerSummary(key, s.seller_name ?? "Gestor");
      map.set(key, entry);
    }

    const meta = parseSaleDetails(s);
    if (meta.isOwnerSale) entry.isOwner = true;

    const commission = toCUP(s.commission_amount, s.commission_currency ?? "CUP", rateCUPperUSD);
    const markup = Math.max(0, toCUP(meta.markupAmount ?? 0, s.currency ?? "USD", rateCUPperUSD));
    // Una o la otra: markup positivo → solo markup; si no → comisión.
    const markupApplies = !meta.isOwnerSale && markup > 0;
    const commissionApplies = !meta.isOwnerSale && !markupApplies;
    const owed = markupApplies ? markup : commissionApplies ? commission : 0;
    const paidRaw = s.commission_paid_amount ?? (s.is_paid ? owed : 0);
    const paid = toCUP(paidRaw, s.commission_currency ?? "CUP", rateCUPperUSD);
    const pending = Math.max(0, owed - paid);

    entry.count += 1;
    if (isUSD) entry.totalUSD += safePrice;
    else entry.totalCUP += safePrice;
    entry.commissionCUP += commissionApplies ? commission : 0;
    entry.markupCUP += markupApplies ? markup : 0;
    entry.owedCUP += owed;
    entry.paidCUP += paid;
    entry.pendingCUP += pending;

    summary.commissionCUP += commissionApplies ? commission : 0;
    summary.markupCUP += markupApplies ? markup : 0;
    summary.owedCUP += owed;
    summary.paidCUP += paid;
    summary.pendingCUP += pending;
  }

  summary.sellers = Array.from(map.values()).sort(
    (a, b) => b.pendingCUP - a.pendingCUP || b.owedCUP - a.owedCUP,
  );
  return summary;
}

/**
 * Utilidades de analytics de la tienda.
 *
 * Las vistas de producto se derivan de la tabla `page_views` (ya la llena
 * `TrafficTracker` en cada cambio de ruta): una vista de producto es una fila
 * con `path` = `/producto/<slug>`.
 *
 * Todo lo de aquí es puro y testeable: la agregación pesada se hace en el
 * cliente del panel admin sobre ventanas de 7/30 días.
 */

export type ReferrerLabel =
  | "Google"
  | "Facebook"
  | "Instagram"
  | "WhatsApp"
  | "TikTok"
  | "Revolico"
  | "Directo"
  | "Interno"
  | "Otro";

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Clasifica el origen de una visita a partir del `document.referrer`.
 * `siteOrigin` (ej. https://tienda-neocharge.vercel.app) permite detectar
 * navegación interna.
 */
export function classifyReferrer(
  referrer: string | null | undefined,
  siteOrigin?: string
): ReferrerLabel {
  const host = hostOf(referrer);
  if (!host) return "Directo";
  const siteHost = hostOf(siteOrigin);
  if (siteHost && (host === siteHost || host.endsWith(`.${siteHost}`))) return "Interno";
  if (host.includes("google.")) return "Google";
  if (host.includes("facebook.com") || host === "fb.com" || host.endsWith(".fb.com"))
    return "Facebook";
  if (host.includes("instagram.com")) return "Instagram";
  if (host.includes("whatsapp.com") || host.includes("wa.me")) return "WhatsApp";
  if (host.includes("tiktok.com")) return "TikTok";
  if (host.includes("revolico.com")) return "Revolico";
  return "Otro";
}

/** Extrae el slug de una ruta `/producto/<slug>` (o null si no es ficha). */
export function extractProductSlug(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "producto" && parts[1]) {
    try {
      return decodeURIComponent(parts[1]);
    } catch {
      return parts[1];
    }
  }
  return null;
}

export interface DayBucket {
  date: string; // YYYY-MM-DD
  label: string; // D/M para el eje
  count: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Agrupa filas por día local, devolviendo `days` cubetas de viejo a nuevo. */
export function countViewsByDay(
  rows: { created_at: string }[],
  days: number,
  now: Date = new Date()
): DayBucket[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    buckets.push({
      date: key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      count: counts.get(key) ?? 0,
    });
  }
  return buckets;
}

/** Top de slugs de producto por cantidad de vistas. */
export function topSlugsByViews(
  rows: { path: string }[],
  limit = 10
): { slug: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const slug = extractProductSlug(r.path);
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface SaleAggregate {
  id: string;
  name: string;
  qty: number;
  revenue: number; // USD
}

interface RawOrderItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
}

/**
 * Agrega unidades vendidas e ingreso por producto a partir de `orders.items`
 * (JSONB). Ignora pedidos cancelados.
 */
export function topProductsBySales(
  orders: { items: unknown; status: string }[],
  limit = 10
): SaleAggregate[] {
  const agg = new Map<string, SaleAggregate>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const items: RawOrderItem[] = Array.isArray(o.items) ? (o.items as RawOrderItem[]) : [];
    for (const it of items) {
      const id = String(it.id ?? it.name ?? "");
      if (!id) continue;
      const qty = Number(it.quantity ?? 0) || 0;
      const price = Number(it.price ?? 0) || 0;
      const cur = agg.get(id) ?? { id, name: String(it.name ?? id), qty: 0, revenue: 0 };
      cur.qty += qty;
      cur.revenue += qty * price;
      if (it.name) cur.name = String(it.name);
      agg.set(id, cur);
    }
  }
  return [...agg.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

/** Conteo de visitas por origen, ordenado de mayor a menor. */
export function countByReferrer(
  rows: { referrer: string | null }[],
  siteOrigin?: string
): { label: ReferrerLabel; count: number }[] {
  const counts = new Map<ReferrerLabel, number>();
  for (const r of rows) {
    const label = classifyReferrer(r.referrer, siteOrigin);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Sincronización del catálogo en segundo plano.
 *
 * - Al abrir la app: refresca los datos si hay conexión buena.
 * - Cada hora (SYNC_INTERVAL_MS): vuelve a descargar el paquete.
 * - Al recuperar la conexión: refresca + envía los pedidos encolados.
 *
 * Nunca bloquea la UI: los componentes ya muestran el caché mientras
 * esto descarga lo nuevo. Con conexión lenta no se hace el refresco
 * pesado (se espera a tener red decente).
 */

import { getSupabase } from "@/integrations/supabase/lazy-client";
import { saveToCache, CACHE_KEYS } from "@/lib/offline-cache";
import { getConnectionQuality } from "./connection";

export const SYNC_INTERVAL_MS = 60 * 60 * 1000; // ~1 hora

const PRODUCTS_SELECT =
  "id,name,slug,description,price,compare_price,images,main_image_index,stock,is_featured,category_id,currency,price_cup,extra_cup_per_usd,warranty_type,created_at,sort_order";

export interface SyncSummary {
  ok: boolean;
  updatedKeys: string[];
  skipped: boolean;
  at: number;
}

async function fetchTable<T>(table: string, select: string, params: Record<string, string> = {}): Promise<T[]> {
  const supabase = await getSupabase();
  // El cliente tipado exige literales de tabla; aquí la tabla es dinámica.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (supabase.from as (t: string) => any)(table);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = from.select(select);
  for (const [k, v] of Object.entries(params)) {
    if (k === "order") {
      const [col, dir] = v.split(".");
      query = query.order(col, { ascending: dir !== "desc" });
    } else if (k === "limit") {
      query = query.limit(parseInt(v, 10));
    } else if (k.endsWith(".eq")) {
      query = query.eq(k.slice(0, -3), v);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

/**
 * Descarga el paquete de datos y lo guarda en el almacén local.
 * Devuelve qué claves se actualizaron. No lanza: reporta en el resumen.
 */
export async function refreshCatalogData(): Promise<SyncSummary> {
  const summary: SyncSummary = { ok: false, updatedKeys: [], skipped: false, at: Date.now() };
  try {
    const quality = await getConnectionQuality();
    if (quality !== "online") {
      summary.skipped = true;
      return summary;
    }

    const [products, categories] = await Promise.all([
      fetchTable("products", PRODUCTS_SELECT, { "is_active.eq": "true", order: "created_at.desc" }),
      fetchTable("categories", "id,name,slug", { order: "sort_order" }),
    ]);
    await saveToCache(CACHE_KEYS.products, products);
    summary.updatedKeys.push(CACHE_KEYS.products);
    await saveToCache(CACHE_KEYS.categories, categories);
    summary.updatedKeys.push(CACHE_KEYS.categories);

    // Destacados: subconjunto de productos (misma forma que la semilla).
    const featured = (products as Array<{ is_featured?: boolean }>).filter((p) => p.is_featured).slice(0, 8);
    await saveToCache(CACHE_KEYS.featured, featured);
    summary.updatedKeys.push(CACHE_KEYS.featured);

    // Tasa de cambio (la más reciente).
    try {
      const rates = await fetchTable<{ usd_to_cup: number; extra_cup_chargers: number; rate_date: string }>(
        "exchange_rates",
        "usd_to_cup,extra_cup_chargers,rate_date",
        { order: "rate_date.desc", limit: "1" },
      );
      if (rates[0]) {
        await saveToCache(CACHE_KEYS.exchangeRate, rates[0]);
        summary.updatedKeys.push(CACHE_KEYS.exchangeRate);
      }
    } catch {
      /* la tasa se refresca por su propio hook; no es crítico */
    }

    // Servicios activos.
    try {
      const services = await fetchTable("services", "*", { "is_active.eq": "true", order: "sort_order" });
      await saveToCache(CACHE_KEYS.services, services);
      summary.updatedKeys.push(CACHE_KEYS.services);
    } catch {
      /* no crítico */
    }

    summary.ok = true;
  } catch (e) {
    console.warn("[offline-sync] no se pudo refrescar el catálogo:", e);
  }
  return summary;
}

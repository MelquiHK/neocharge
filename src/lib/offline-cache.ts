/**
 * Caché offline de datos de la tienda.
 *
 * Cuando el cliente pierde internet (o abre la app sin conexión), los
 * productos, categorías y la tasa se sirven desde el caché local guardado
 * en la última visita con conexión. Así la tienda sigue siendo funcional
 * sin internet: se puede revisar todo, solo no se pueden hacer pedidos
 * nuevos ni ver imágenes que nunca se cargaron.
 *
 * Uso:
 *   const { data, fromCache } = await fetchWithCache("products", () =>
 *     supabase.from("products").select("...").then(r => r.data)
 *   );
 */

const PREFIX = "nc_offline_";
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

interface CacheEnvelope {
  data: unknown;
  savedAt: number;
}

export function saveToCache(key: string, data: unknown): void {
  try {
    const envelope: CacheEnvelope = { data, savedAt: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // localStorage lleno o no disponible: se ignora, la app sigue online.
  }
}

export function loadFromCache<T>(key: string, maxAgeMs: number = DEFAULT_MAX_AGE): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope;
    if (Date.now() - envelope.savedAt > maxAgeMs) return null;
    return envelope.data as T;
  } catch {
    return null;
  }
}

export function hasCache(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) != null;
  } catch {
    return false;
  }
}

export interface CachedResult<T> {
  data: T | null;
  /** true si los datos vinieron del caché (sin conexión o fallo de red). */
  fromCache: boolean;
}

/**
 * Intenta el fetcher (red); si falla, devuelve el caché.
 * Si la red funciona, guarda el resultado para la próxima vez sin conexión.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T | null | undefined>,
  maxAgeMs: number = DEFAULT_MAX_AGE,
): Promise<CachedResult<T>> {
  // Sin conexión: ir directo al caché, sin intentar la red.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { data: loadFromCache<T>(key, maxAgeMs), fromCache: true };
  }
  try {
    const data = await fetcher();
    if (data != null) {
      saveToCache(key, data);
      return { data, fromCache: false };
    }
    throw new Error("empty response");
  } catch {
    return { data: loadFromCache<T>(key, maxAgeMs), fromCache: true };
  }
}

/** Claves de caché usadas por la tienda. */
export const CACHE_KEYS = {
  products: "products_v1",
  categories: "categories_v1",
  exchangeRate: "exchange_rate_v1",
  featured: "featured_v1",
} as const;

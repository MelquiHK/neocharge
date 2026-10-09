/**
 * Caché offline de datos de la tienda (ahora sobre IndexedDB).
 *
 * Cuando el cliente pierde internet (o abre la app sin conexión), los
 * productos, categorías y la tasa se sirven desde el almacén local guardado
 * en la última visita con conexión. Así la tienda sigue siendo funcional
 * sin internet: se puede revisar todo, solo no se pueden hacer pedidos
 * nuevos ni ver imágenes que nunca se cargaron.
 *
 * Uso:
 *   const { data, fromCache } = await fetchWithCache("products", () =>
 *     supabase.from("products").select("...").then(r => r.data)
 *   );
 *
 * NOTA: la API pública no cambió respecto a la versión con localStorage;
 * por dentro ahora usa IndexedDB (más capacidad, no bloquea el hilo).
 * Los cachés viejos de localStorage (prefijo nc_offline_) se migran solos
 * la primera vez que se leen.
 */

import { idbSet, idbGet } from "./offline/db";

const LEGACY_PREFIX = "nc_offline_";
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function saveToCache(key: string, data: unknown): Promise<void> {
  try {
    await idbSet("kv", key, data);
  } catch {
    /* el respaldo en memoria de db.ts ya lo intentó */
  }
}

interface LegacyEnvelope {
  data: unknown;
  savedAt: number;
}

function loadLegacy<T>(key: string): { value: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(LEGACY_PREFIX + key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as LegacyEnvelope;
    return { value: envelope.data as T, savedAt: envelope.savedAt };
  } catch {
    return null;
  }
}

async function readWithMigration<T>(key: string): Promise<{ value: T; savedAt: number } | null> {
  const rec = await idbGet<T>("kv", key);
  if (rec) return rec;
  // Migrar el caché viejo de localStorage una sola vez.
  const legacy = loadLegacy<T>(key);
  if (legacy) {
    await saveToCache(key, legacy.value);
    return legacy;
  }
  return null;
}

export async function loadFromCache<T>(key: string, maxAgeMs: number = DEFAULT_MAX_AGE): Promise<T | null> {
  const rec = await readWithMigration<T>(key);
  if (!rec) return null;
  if (Date.now() - rec.savedAt > maxAgeMs) return null;
  return rec.value;
}

/** Fecha (ms) en que se guardó la clave, o null si no hay datos. */
export async function getCacheSavedAt(key: string): Promise<number | null> {
  const rec = await readWithMigration<unknown>(key);
  return rec ? rec.savedAt : null;
}

export async function hasCache(key: string): Promise<boolean> {
  const rec = await readWithMigration<unknown>(key);
  return rec != null;
}

/**
 * Siembra la "base de datos local" desde el archivo empaquetado en la app
 * (public/offline-seed.json, generado en el build con
 * scripts/export-offline-seed.mjs). Solo rellena las claves que estén vacías:
 * nunca pisa datos más frescos guardados por la red.
 *
 * Llamar una vez al arrancar la app.
 */
export async function seedFromBundle(): Promise<void> {
  try {
    // Si ya hay datos, no hace falta la semilla.
    if (await hasCache(CACHE_KEYS.products)) return;
    // Ruta absoluta desde la raíz: funciona tanto en la web como en la app
    // nativa (http://localhost/offline-seed.json). El service worker la
    // tiene precacheada, así que funciona incluso en la primera instalación
    // sin internet.
    const res = await fetch(`${import.meta.env.BASE_URL}offline-seed.json`);
    if (!res.ok) return;
    const seed = await res.json();
    const data = seed?.data;
    if (!data || typeof data !== "object") return;
    for (const [key, value] of Object.entries(data)) {
      if (value != null && !(await hasCache(key))) {
        // La semilla se guarda como si fuera fresca: es lo mejor que hay
        // hasta que la red traiga datos nuevos.
        await saveToCache(key, value);
      }
    }
  } catch {
    // Sin semilla o sin acceso: la app sigue funcionando online.
  }
}

/**
 * Lee el caché sin importar su antigüedad (último recurso offline).
 */
async function loadStale<T>(key: string): Promise<T | null> {
  const rec = await readWithMigration<T>(key);
  return rec ? rec.value : null;
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
  // Se acepta aunque esté vencido: datos viejos > pantalla vacía.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { data: await loadStale<T>(key), fromCache: true };
  }
  try {
    const data = await fetcher();
    if (data != null) {
      await saveToCache(key, data);
      return { data, fromCache: false };
    }
    throw new Error("empty response");
  } catch {
    return { data: (await loadFromCache<T>(key, maxAgeMs)) ?? (await loadStale<T>(key)), fromCache: true };
  }
}

/** Claves de caché usadas por la tienda. */
export const CACHE_KEYS = {
  products: "products_v1",
  categories: "categories_v1",
  exchangeRate: "exchange_rate_v1",
  featured: "featured_v1",
  services: "services_v1",
  blog: "blog_v1",
} as const;

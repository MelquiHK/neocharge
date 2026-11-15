/**
 * Caché en memoria del panel de administración.
 *
 * Vive a nivel de módulo: sobrevive al desmontaje de las secciones cuando
 * Mel cambia de pestaña (Resumen → Productos → Pedidos…), pero se limpia
 * solo al recargar la página. Cada hook de lista guarda aquí su último
 * resultado; al volver a montar, la sección pinta AL INSTANTE desde esta
 * caché y refresca en segundo plano, sin pantalla de «Cargando…».
 *
 * No sustituye a la base de datos: es solo la última foto conocida.
 * Las mutaciones actualizan también la caché para que ninguna sección
 * muestre datos viejos tras editar en otra.
 */

const store = new Map<string, unknown>();

export function getAdminCache<T>(key: string): T | undefined {
  return store.has(key) ? (store.get(key) as T) : undefined;
}

export function setAdminCache<T>(key: string, value: T): void {
  store.set(key, value);
}

export function clearAdminCache(key?: string): void {
  if (key) store.delete(key);
  else store.clear();
}

/** Claves usadas por las secciones del panel. */
export const ADMIN_CACHE_KEYS = {
  products: "admin:products",
  productCategories: "admin:product-categories",
  productLocations: "admin:product-locations",
  orders: "admin:orders",
  categories: "admin:categories",
  services: "admin:services",
  locations: "admin:locations",
  customers: "admin:customers",
  sales: "admin:sales",
} as const;

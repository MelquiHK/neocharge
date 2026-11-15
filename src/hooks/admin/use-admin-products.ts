import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Category, StoreLocation } from "@/types";
import { toast } from "sonner";
import { ADMIN_CACHE_KEYS, getAdminCache, setAdminCache } from "@/lib/admin-cache";

interface ProductsCache {
  products: Product[];
  categories: Category[];
  locations: StoreLocation[];
}

/**
 * Productos del panel con caché en memoria y mutaciones locales.
 *
 * Antes: cada visita a la sección recargaba TODO desde Supabase con la
 * pantalla bloqueada en «Cargando productos…», y cada guardado, borrado o
 * toque de un interruptor disparaba otro refetch completo de 3 tablas.
 *
 * Ahora:
 * - Al montar, si hay caché de esta sesión, la lista pinta AL INSTANTE y
 *   se refresca en segundo plano (sin bloquear, sin spinner de pantalla).
 * - Guardar / eliminar / activar / cambiar stock actualizan la lista en
 *   memoria en cuanto la base de datos confirma — cero refetch.
 * - Eliminar es optimista tras la confirmación: la fila desaparece al
 *   instante; si la base de datos falla, la fila vuelve y se avisa.
 */
export function useAdminProducts() {
  const cached = getAdminCache<ProductsCache>(ADMIN_CACHE_KEYS.products);
  const [products, setProductsState] = useState<Product[]>(cached?.products ?? []);
  const [categories, setCategories] = useState<Category[]>(cached?.categories ?? []);
  const [locations, setLocations] = useState<StoreLocation[]>(cached?.locations ?? []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const hasData = useRef(!!cached);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? hasData.current;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [{ data: p }, { data: c }, { data: l }] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("id,name").order("sort_order"),
        supabase.from("store_locations").select("id,name").eq("is_active", true).order("sort_order"),
      ]);
      const nextProducts = (p ?? []) as Product[];
      const nextCategories = (c ?? []) as unknown as Category[];
      const nextLocations = (l ?? []) as unknown as StoreLocation[];
      hasData.current = true;
      setProductsState(nextProducts);
      setCategories(nextCategories);
      setLocations(nextLocations);
      setAdminCache(ADMIN_CACHE_KEYS.productCategories, nextCategories);
      setAdminCache(ADMIN_CACHE_KEYS.productLocations, nextLocations);
      setAdminCache<ProductsCache>(ADMIN_CACHE_KEYS.products, {
        products: nextProducts,
        categories: nextCategories,
        locations: nextLocations,
      });
    } catch (error: unknown) {
      if (!hasData.current) {
        toast.error("Error al cargar datos: " + (error instanceof Error ? error.message : String(error)));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Con caché: refresco silencioso en segundo plano. Sin caché: carga inicial.
    void load({ silent: hasData.current });
  }, [load]);

  /** Refresco manual: nunca bloquea si ya hay datos pintados. */
  const refresh = useCallback(() => load({ silent: true }), [load]);

  /** Inserta o reemplaza un producto en la lista local (tras guardar). */
  const upsertLocal = useCallback((product: Product) => {
    setProductsState((prev) => {
      const idx = prev.findIndex((x) => x.id === product.id);
      const next = idx >= 0
        ? prev.map((x) => (x.id === product.id ? { ...x, ...product } : x))
        : [product, ...prev];
      setAdminCache<ProductsCache>(ADMIN_CACHE_KEYS.products, {
        products: next,
        categories: getAdminCache<Category[]>(ADMIN_CACHE_KEYS.productCategories) ?? [],
        locations: getAdminCache<StoreLocation[]>(ADMIN_CACHE_KEYS.productLocations) ?? [],
      });
      return next;
    });
  }, []);

  /** Aplica un parche a uno o varios productos en la lista local. */
  const patchLocal = useCallback((ids: string[], patch: Partial<Product>) => {
    const idSet = new Set(ids);
    setProductsState((prev) => {
      const next = prev.map((x) => (idSet.has(x.id) ? { ...x, ...patch } : x));
      setAdminCache<ProductsCache>(ADMIN_CACHE_KEYS.products, {
        products: next,
        categories: getAdminCache<Category[]>(ADMIN_CACHE_KEYS.productCategories) ?? [],
        locations: getAdminCache<StoreLocation[]>(ADMIN_CACHE_KEYS.productLocations) ?? [],
      });
      return next;
    });
  }, []);

  /** Quita productos de la lista local (tras eliminar en la BD). */
  const removeLocal = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setProductsState((prev) => {
      const next = prev.filter((x) => !idSet.has(x.id));
      setAdminCache<ProductsCache>(ADMIN_CACHE_KEYS.products, {
        products: next,
        categories: getAdminCache<Category[]>(ADMIN_CACHE_KEYS.productCategories) ?? [],
        locations: getAdminCache<StoreLocation[]>(ADMIN_CACHE_KEYS.productLocations) ?? [],
      });
      return next;
    });
  }, []);

  /**
   * Elimina un producto: la fila desaparece al instante (la confirmación
   * la pide el AlertDialog de la interfaz, como siempre). Si la base de
   * datos rechaza el borrado, la fila se restaura y se avisa del error.
   */
  const deleteProduct = async (id: string) => {
    const snapshot = products;
    removeLocal([id]);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      setProductsState(snapshot);
      setAdminCache<ProductsCache>(ADMIN_CACHE_KEYS.products, {
        products: snapshot,
        categories: getAdminCache<Category[]>(ADMIN_CACHE_KEYS.productCategories) ?? [],
        locations: getAdminCache<StoreLocation[]>(ADMIN_CACHE_KEYS.productLocations) ?? [],
      });
      toast.error(error.message);
      return false;
    }
    toast.success("Producto eliminado");
    return true;
  };

  return {
    products,
    categories,
    locations,
    loading,
    refreshing,
    refresh,
    deleteProduct,
    upsertLocal,
    patchLocal,
    removeLocal,
  };
}

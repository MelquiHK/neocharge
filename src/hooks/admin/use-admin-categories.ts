import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types";
import { toast } from "sonner";
import { ADMIN_CACHE_KEYS, getAdminCache, setAdminCache } from "@/lib/admin-cache";

/**
 * Categorías con caché en memoria: al volver a la pestaña la lista pinta
 * al instante y el refresco (`refresh`) es silencioso, sin bloquear.
 * Eliminar quita la fila en memoria en cuanto la BD confirma.
 */
export function useAdminCategories() {
  const cached = getAdminCache<Category[]>(ADMIN_CACHE_KEYS.categories);
  const [categories, setCategoriesState] = useState<Category[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const hasData = useRef(!!cached);

  const load = useCallback(async () => {
    if (!hasData.current) setLoading(true);
    try {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      hasData.current = true;
      const next = (data ?? []) as Category[];
      setCategoriesState(next);
      setAdminCache(ADMIN_CACHE_KEYS.categories, next);
    } catch (error: unknown) {
      if (!hasData.current) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setCategoriesState((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setAdminCache(ADMIN_CACHE_KEYS.categories, next);
      return next;
    });
    toast.success("Categoría eliminada");
    return true;
  };

  return {
    categories,
    loading,
    refresh: load,
    deleteCategory,
  };
}

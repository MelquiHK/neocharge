import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreLocation } from "@/types";
import { toast } from "sonner";
import { ADMIN_CACHE_KEYS, getAdminCache, setAdminCache } from "@/lib/admin-cache";

export type StoreLocationInput = Omit<Partial<StoreLocation>, "created_at" | "updated_at"> & {
  name: string;
  address: string;
  location_type: string;
};

/**
 * Locales con caché en memoria: al volver a la pestaña la lista pinta al
 * instante y los refrescos son silenciosos. Guardar/eliminar actualizan
 * la lista en memoria reutilizando la fila que devuelve la BD, sin
 * recargar la tabla completa.
 */
export function useAdminLocations() {
  const cached = getAdminCache<StoreLocation[]>(ADMIN_CACHE_KEYS.locations);
  const [locations, setLocationsState] = useState<StoreLocation[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const hasData = useRef(!!cached);

  const load = useCallback(async () => {
    if (!hasData.current) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_locations")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      hasData.current = true;
      const next = (data ?? []) as StoreLocation[];
      setLocationsState(next);
      setAdminCache(ADMIN_CACHE_KEYS.locations, next);
    } catch (error: unknown) {
      if (!hasData.current) {
        toast.error("No se pudo cargar los locales: " + (error instanceof Error ? error.message : String(error)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upsertLocalRow = (row: StoreLocation) => {
    setLocationsState((prev) => {
      const idx = prev.findIndex((l) => l.id === row.id);
      const next = idx >= 0 ? prev.map((l) => (l.id === row.id ? row : l)) : [...prev, row];
      next.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
      setAdminCache(ADMIN_CACHE_KEYS.locations, next);
      return next;
    });
  };

  const saveLocation = async (payload: StoreLocationInput) => {
    try {
      if (payload.id) {
        const { data, error } = await supabase
          .from("store_locations")
          .update(payload)
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        if (data) upsertLocalRow(data as StoreLocation);
        toast.success("Local actualizado");
      } else {
        const { data, error } = await supabase
          .from("store_locations")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) upsertLocalRow(data as StoreLocation);
        toast.success("Local creado");
      }
      return true;
    } catch (error: unknown) {
      toast.error("Error guardando local: " + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const { error } = await supabase.from("store_locations").delete().eq("id", id);
      if (error) throw error;
      setLocationsState((prev) => {
        const next = prev.filter((l) => l.id !== id);
        setAdminCache(ADMIN_CACHE_KEYS.locations, next);
        return next;
      });
      toast.success("Local eliminado");
      return true;
    } catch (error: unknown) {
      toast.error("Error al eliminar local: " + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };

  return {
    locations,
    loading,
    refresh: load,
    saveLocation,
    deleteLocation,
  };
}

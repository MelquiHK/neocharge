import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Service } from "@/types";
import { ADMIN_CACHE_KEYS, getAdminCache, setAdminCache } from "@/lib/admin-cache";

/**
 * Servicios con caché en memoria: al volver a la pestaña la lista pinta
 * al instante y el refresco (`refresh`) es silencioso, sin bloquear.
 * Eliminar quita la fila en memoria en cuanto la BD confirma.
 */
export function useAdminServices() {
  const cached = getAdminCache<Service[]>(ADMIN_CACHE_KEYS.services);
  const [services, setServicesState] = useState<Service[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const hasData = useRef(!!cached);

  const load = useCallback(async () => {
    if (!hasData.current) setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      if (!hasData.current) {
        toast.error("Error al cargar servicios: " + error.message);
        setServicesState([]);
      }
    } else {
      hasData.current = true;
      const next = (data ?? []) as Service[];
      setServicesState(next);
      setAdminCache(ADMIN_CACHE_KEYS.services, next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setServicesState((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setAdminCache(ADMIN_CACHE_KEYS.services, next);
      return next;
    });
    toast.success("Servicio eliminado");
    return true;
  };

  return {
    services,
    loading,
    refresh: load,
    deleteService,
  };
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreLocation } from "@/types";
import { toast } from "sonner";

export type StoreLocationInput = Omit<Partial<StoreLocation>, "created_at" | "updated_at"> & {
  name: string;
  address: string;
  location_type: string;
};

export function useAdminLocations() {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_locations")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      setLocations((data ?? []) as StoreLocation[]);
    } catch (error: any) {
      toast.error("No se pudo cargar los locales: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveLocation = async (payload: StoreLocationInput) => {
    try {
      if (payload.id) {
        const { error } = await supabase.from("store_locations").update(payload as any).eq("id", payload.id);
        if (error) throw error;
        toast.success("Local actualizado");
      } else {
        const { error } = await supabase.from("store_locations").insert(payload as any);
        if (error) throw error;
        toast.success("Local creado");
      }
      await load();
      return true;
    } catch (error: any) {
      toast.error("Error guardando local: " + error.message);
      return false;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const { error } = await supabase.from("store_locations").delete().eq("id", id);
      if (error) throw error;
      toast.success("Local eliminado");
      await load();
      return true;
    } catch (error: any) {
      toast.error("Error al eliminar local: " + error.message);
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

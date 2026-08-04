import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Service } from "@/types";

export function useAdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar servicios: " + error.message);
      setServices([]);
    } else {
      setServices((data ?? []) as Service[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Servicio eliminado");
    await load();
    return true;
  };

  return {
    services,
    loading,
    refresh: load,
    deleteService,
  };
}

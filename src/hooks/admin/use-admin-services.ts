import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Category, StoreLocation } from "@/types";
import { toast } from "sonner";

export function useAdminServices() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: s }, { data: c }, { data: r }] = await Promise.all([
        supabase.from("services").select("*").order("sort_order").order("created_at", { ascending: false }),
        supabase.from("service_categories").select("*").order("sort_order"),
        supabase.from("service_requests").select("*, services(name)").order("created_at", { ascending: false }).limit(50),
      ]);
      setServices(s ?? []);
      setCategories(c ?? []);
      setRequests(r ?? []);
    } catch (error: any) {
      toast.error("Error al cargar servicios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("service_categories").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Categoría eliminada");
    await load();
    return true;
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("service_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Estado actualizado");
    await load();
    return true;
  };

  return {
    services,
    categories,
    requests,
    loading,
    refresh: load,
    deleteService,
    deleteCategory,
    updateRequestStatus,
  };
}

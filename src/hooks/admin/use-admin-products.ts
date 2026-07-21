import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Category, StoreLocation } from "@/types";
import { toast } from "sonner";

export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: c }, { data: l }] = await Promise.all([
        supabase.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
        supabase.from("categories").select("id,name").order("sort_order"),
        supabase.from("store_locations").select("id,name").eq("is_active", true).order("sort_order"),
      ]);
      setProducts((p ?? []) as Product[]);
      setCategories((c ?? []) as Category[]);
      setLocations((l ?? []) as StoreLocation[]);
    } catch (error: any) {
      toast.error("Error al cargar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Producto eliminado");
    await load();
    return true;
  };

  return {
    products,
    categories,
    locations,
    loading,
    refresh: load,
    deleteProduct,
  };
}

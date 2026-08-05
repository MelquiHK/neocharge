import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAdminSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // admins can see all, sellers see their own due to RLS
    const { data, error } = await supabase.from("seller_sales").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Load sales error:", error);
      setSales([]);
    } else {
      setSales(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load, user]);

  const createSale = useCallback(async (payload: any) => {
    const { data, error } = await supabase.from("seller_sales").insert(payload).select().single();
    if (error) throw error;
    setSales((s) => [data, ...s]);
    return data;
  }, []);

  const markPaid = useCallback(async (id: string) => {
    const { data, error } = await supabase.from("seller_sales").update({ is_paid: true }).eq("id", id).select().single();
    if (error) throw error;
    setSales((s) => s.map((x) => (x.id === id ? data : x)));
    return data;
  }, []);

  const removeSale = useCallback(async (id: string) => {
    const { error } = await supabase.from("seller_sales").delete().eq("id", id);
    if (error) throw error;
    setSales((s) => s.filter((x) => x.id !== id));
  }, []);

  return { sales, loading, load, createSale, markPaid, removeSale };
}

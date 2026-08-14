import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAdminSales() {
  const { user, permissions } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    let query = supabase.from("seller_sales").select("*");

    if (!permissions.is_owner) {
      query = query.eq("seller_user_id", user?.id ?? "__none__");
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("Load sales error:", error);
      setSales([]);
    } else {
      setSales(data ?? []);
    }
    setLoading(false);
  }, [permissions.is_owner, user?.id]);

  useEffect(() => { void load(); }, [load]);

  const createSale = useCallback(async (payload: any) => {
    const safePayload = {
      ...payload,
      seller_user_id: user?.id ?? payload.seller_user_id ?? null,
      seller_name: payload.seller_name || user?.email || "Gestor",
    };

    const { data, error } = await supabase.from("seller_sales").insert(safePayload).select().single();
    if (error) throw error;
    setSales((s) => [data, ...s]);
    return data;
  }, [user?.email, user?.id]);

  const markPaid = useCallback(async (id: string) => {
    // Get the sale first to know the commission amount
    const { data: sale } = await supabase.from("seller_sales").select("commission_amount").eq("id", id).single();
    
    let query = supabase.from("seller_sales").update({ 
      is_paid: true,
      commission_paid_amount: sale?.commission_amount || 0 
    }).eq("id", id);

    if (!permissions.is_owner) {
      query = query.eq("seller_user_id", user?.id ?? "__none__");
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    setSales((s) => s.map((x) => (x.id === id ? data : x)));
    return data;
  }, [permissions.is_owner, user?.id]);

  const removeSale = useCallback(async (id: string) => {
    let query = supabase.from("seller_sales").delete().eq("id", id);

    if (!permissions.is_owner) {
      query = query.eq("seller_user_id", user?.id ?? "__none__");
    }

    const { error } = await query;
    if (error) throw error;
    setSales((s) => s.filter((x) => x.id !== id));
  }, [permissions.is_owner, user?.id]);

  return { sales, loading, load, createSale, markPaid, removeSale };
}

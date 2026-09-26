import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { SellerSale } from "@/lib/sales";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useAdminSales() {
  const { user, permissions } = useAuth();
  const [sales, setSales] = useState<SellerSale[]>([]);
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

  const createSale = useCallback(async (payload: Record<string, unknown>) => {
    // El dueño puede registrar ventas a nombre de otro vendedor
    // ("Yo (Mel)" o un gestor); los gestores solo pueden registrar
    // ventas propias.
    const explicitSeller = permissions.is_owner && payload.seller_user_id !== undefined;
    const safePayload = {
      ...payload,
      seller_user_id: explicitSeller ? (payload.seller_user_id ?? null) : (user?.id ?? null),
      seller_name: explicitSeller
        ? (payload.seller_name || "Gestor")
        : (payload.seller_name || user?.email || "Gestor"),
    };

    const { data, error } = await supabase
      .from("seller_sales")
      .insert(safePayload as TablesInsert<"seller_sales">)
      .select()
      .single();
    if (error) throw error;
    setSales((s) => [data, ...s]);
    return data;
  }, [permissions.is_owner, user?.email, user?.id]);

  const updateSale = useCallback(async (id: string, patch: Record<string, unknown>) => {
    let query = supabase.from("seller_sales").update(patch as TablesUpdate<"seller_sales">).eq("id", id);

    if (!permissions.is_owner) {
      query = query.eq("seller_user_id", user?.id ?? "__none__");
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    setSales((s) => s.map((x) => (x.id === id ? data : x)));
    return data;
  }, [permissions.is_owner, user?.id]);

  const markPaid = useCallback(async (id: string, amount?: number) => {
    // Marca la comisión como pagada. Si se pasa `amount`, se registra
    // ese monto (p. ej. lo debido según getSaleOwed); si no, se usa la
    // comisión configurada (comportamiento anterior).
    let commissionAmount: number | undefined;
    if (amount === undefined) {
      const { data: sale } = await supabase.from("seller_sales").select("commission_amount").eq("id", id).single();
      commissionAmount = Number(sale?.commission_amount ?? 0);
    } else {
      commissionAmount = amount;
    }

    let query = supabase.from("seller_sales").update({
      is_paid: true,
      commission_paid_amount: commissionAmount,
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

  return { sales, loading, load, createSale, updateSale, markPaid, removeSale };
}

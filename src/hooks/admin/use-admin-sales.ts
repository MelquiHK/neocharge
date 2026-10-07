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
    const resolvedSellerId = explicitSeller ? (payload.seller_user_id ?? null) : (user?.id ?? null);
    const resolvedSellerName = explicitSeller
      ? (payload.seller_name || "Gestor")
      : (payload.seller_name || user?.email || "Gestor");

    const sourceType = payload.source_type === "partner" ? "partner" : "own";
    const deliveryType = payload.delivery_type === "mensajeria" ? "mensajeria" : "recogida";
    const productId = (payload.product_id as string | null) ?? null;

    // Intento principal: RPC transaccional (descuenta stock, valida la
    // fuente y crea el hold en el ledger del socio). Requiere un producto
    // real: las ventas de texto libre (sin product_id) no tienen inventario
    // que descontar y van por el insert directo.
    if (productId) {
      try {
        const { data: saleId, error } = await supabase.rpc("register_sale_with_fulfillment", {
          // La RPC exige p_seller_user_id = auth.uid(); si el dueño registra
          // a nombre de un gestor, se crea con su propio id y se reatribuye
          // abajo (el dueño puede editar cualquier venta).
          p_seller_user_id: user?.id ?? null,
          p_seller_name: String(resolvedSellerName ?? "Gestor"),
          p_product_id: productId,
          p_product_name: String(payload.product_name ?? ""),
          p_price: Number(payload.price ?? 0),
          p_currency: String(payload.currency ?? "USD"),
          p_customer_name: String(payload.customer_name ?? ""),
          p_customer_phone: String(payload.customer_phone ?? ""),
          p_commission_amount: Number(payload.commission_amount ?? 0),
          p_commission_currency: String(payload.commission_currency ?? "CUP"),
          p_sale_details: String(payload.sale_details ?? ""),
          p_delivery_type: deliveryType,
          p_source_type: sourceType,
          p_partner_id: (payload.partner_id as string | null) ?? null,
          p_partner_location_id: (payload.partner_location_id as string | null) ?? null,
          p_location_name: (payload.rpc_location_name as string | null) ?? null,
        });
        if (error) throw error;

        const { data: sale, error: fetchError } = await supabase
          .from("seller_sales")
          .select("*")
          .eq("id", saleId as string)
          .single();
        if (fetchError) throw fetchError;

        // Campos que la RPC no gestiona: monto a deber, notas y la
        // reatribución cuando el dueño vende a nombre de un gestor.
        const patch: Record<string, unknown> = {};
        if (payload.amount_to_receive !== undefined) patch.amount_to_receive = payload.amount_to_receive;
        if (payload.notes) patch.notes = payload.notes;
        if (resolvedSellerId && resolvedSellerId !== user?.id) {
          patch.seller_user_id = resolvedSellerId;
        }
        if (Object.keys(patch).length > 0) {
          const { data: patched, error: patchError } = await supabase
            .from("seller_sales")
            .update(patch as TablesUpdate<"seller_sales">)
            .eq("id", saleId as string)
            .select()
            .single();
          if (patchError) throw patchError;
          setSales((s) => [patched, ...s]);
          return patched;
        }
        setSales((s) => [sale, ...s]);
        return sale;
      } catch (rpcError: unknown) {
        const msg = rpcError instanceof Error ? rpcError.message : String(rpcError);
        // Solo se cae al insert directo si la RPC no existe (migración
        // pendiente). Cualquier otro error (sin stock, validación, etc.)
        // se propaga tal cual.
        if (!/does not exist|Could not find|not found/i.test(msg)) throw rpcError;
      }
    }

    // Fallback: insert directo (sin surtido por socio).
    const safePayload = {
      ...payload,
      seller_user_id: resolvedSellerId,
      seller_name: resolvedSellerName,
    };
    // Campos del flujo RPC: delivery_type sí es columna real (se conserva);
    // el resto solo existe con la migración de socios aplicada (si la RPC
    // no existe, esas columnas tampoco).
    delete safePayload.source_type;
    delete safePayload.partner_id;
    delete safePayload.partner_location_id;
    delete safePayload.rpc_location_name;

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

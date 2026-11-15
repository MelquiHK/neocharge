import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types";
import { toast } from "sonner";
import { ADMIN_CACHE_KEYS, getAdminCache, setAdminCache } from "@/lib/admin-cache";

/**
 * Pedidos del panel con caché en memoria y mutaciones locales.
 * Cambiar el estado de un pedido o eliminarlo ya NO recarga la lista
 * completa: se aplica en memoria en cuanto la BD confirma. Al volver a
 * la pestaña, la lista pinta al instante desde la caché y el realtime
 * refresca en segundo plano sin bloquear.
 */
export function useAdminOrders() {
  const cached = getAdminCache<Order[]>(ADMIN_CACHE_KEYS.orders);
  const [orders, setOrdersState] = useState<Order[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const hasData = useRef(!!cached);

  const setOrders = useCallback((next: Order[]) => {
    hasData.current = true;
    setOrdersState(next);
    setAdminCache(ADMIN_CACHE_KEYS.orders, next);
  }, []);

  const load = useCallback(async () => {
    // Si ya hay datos pintados, el refresco es silencioso (sin spinner).
    if (!hasData.current) setLoading(true);
    try {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setOrders((data ?? []) as Order[]);
    } catch (error: unknown) {
      if (!hasData.current) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setLoading(false);
    }
  }, [setOrders]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("orders-admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setOrdersState((prev) => {
      const next = prev.map((o) => (o.id === id ? { ...o, status } : o));
      setAdminCache(ADMIN_CACHE_KEYS.orders, next);
      return next;
    });
    toast.success("Estado actualizado");
    return true;
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setOrdersState((prev) => {
      const next = prev.filter((o) => o.id !== id);
      setAdminCache(ADMIN_CACHE_KEYS.orders, next);
      return next;
    });
    toast.success("Pedido eliminado");
    return true;
  };

  const deleteManyOrders = async (ids: string[]) => {
    const { error } = await supabase.from("orders").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return false;
    }
    const idSet = new Set(ids);
    setOrdersState((prev) => {
      const next = prev.filter((o) => !idSet.has(o.id));
      setAdminCache(ADMIN_CACHE_KEYS.orders, next);
      return next;
    });
    toast.success("Pedidos eliminados");
    return true;
  };

  return {
    orders,
    loading,
    refresh: load,
    updateStatus,
    deleteOrder,
    deleteManyOrders,
  };
}

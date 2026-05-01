import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types";
import { toast } from "sonner";

export function useAdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data ?? []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("orders-admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Estado actualizado");
    await load();
    return true;
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Pedido eliminado");
    await load();
    return true;
  };

  const deleteManyOrders = async (ids: string[]) => {
    const { error } = await supabase.from("orders").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Pedidos eliminados");
    await load();
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

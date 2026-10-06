import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Partner {
  id: string;
  name: string;
  contact_name: string | null;
  phone_private: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PartnerLocation {
  id: string;
  partner_id: string;
  name: string;
  address: string;
  area: string | null;
  attendant_name: string | null;
  latitude: number | null;
  longitude: number | null;
  map_link: string | null;
  hours: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PartnerLedgerEntry {
  id: string;
  partner_id: string;
  kind: "hold" | "pickup" | "adjustment";
  amount_usd: number;
  sale_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProductPartnerInfo {
  partner_id: string;
  partner_price: number;
  is_active: boolean;
}

export interface ProductPartnerData {
  /** partner_id -> precio del socio */
  prices: Record<string, number>;
  /** location_id -> cantidad */
  stock: Record<string, number>;
}

export type PartnerInput = Omit<Partial<Partner>, "created_at"> & { name: string };
export type PartnerLocationInput = Omit<Partial<PartnerLocation>, "id"> & {
  partner_id: string;
  name: string;
  address: string;
};

function isMissingTable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || /relation .* does not exist/i.test(msg) || /Could not find the table/i.test(msg);
}

export function useAdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  /** true si las tablas de socios aún no existen en la BD (migración pendiente). */
  const [needsMigration, setNeedsMigration] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ps, error: e1 } = await supabase
        .from("partners")
        .select("*")
        .order("name");
      if (e1) {
        if (isMissingTable(e1)) {
          setNeedsMigration(true);
          setPartners([]);
          setBalances({});
          return;
        }
        throw e1;
      }
      setNeedsMigration(false);
      setPartners((ps ?? []) as Partner[]);

      const { data: bs, error: e2 } = await supabase
        .from("partner_balances")
        .select("partner_id, balance_usd");
      if (e2) throw e2;
      const map: Record<string, number> = {};
      ((bs ?? []) as { partner_id: string; balance_usd: number | string }[]).forEach((b) => {
        map[b.partner_id] = Number(b.balance_usd ?? 0);
      });
      setBalances(map);
    } catch (error: unknown) {
      toast.error("No se pudieron cargar los socios: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePartner = async (payload: PartnerInput): Promise<boolean> => {
    try {
      if (payload.id) {
        const { error } = await supabase.from("partners").update(payload).eq("id", payload.id);
        if (error) throw error;
        toast.success("Socio actualizado");
      } else {
        const { error } = await supabase.from("partners").insert(payload);
        if (error) throw error;
        toast.success("Socio creado");
      }
      await load();
      return true;
    } catch (error: unknown) {
      toast.error("Error guardando socio: " + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };

  const deletePartner = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
      toast.success("Socio eliminado");
      await load();
      return true;
    } catch (error: unknown) {
      toast.error("Error eliminando socio: " + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };

  const loadLocations = useCallback(async (partnerId: string): Promise<PartnerLocation[]> => {
    try {
      const { data, error } = await supabase
        .from("partner_locations")
        .select("*")
        .eq("partner_id", partnerId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PartnerLocation[];
    } catch (error: unknown) {
      if (!isMissingTable(error)) {
        toast.error("No se pudieron cargar los locales: " + (error instanceof Error ? error.message : String(error)));
      }
      return [];
    }
  }, []);

  /** Todos los locales activos de todos los socios (para el diálogo de venta). */
  const loadAllLocations = useCallback(async (): Promise<(PartnerLocation & { partner_name: string })[]> => {
    try {
      const { data, error } = await supabase
        .from("partner_locations")
        .select("*, partners!inner(name)")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return ((data ?? []) as Array<PartnerLocation & { partners: { name: string } }>).map((l) => ({
        ...l,
        partner_name: l.partners.name,
      }));
    } catch (error: unknown) {
      if (!isMissingTable(error)) {
        toast.error("No se pudieron cargar los locales: " + (error instanceof Error ? error.message : String(error)));
      }
      return [];
    }
  }, []);

  const saveLocation = async (payload: PartnerLocationInput & { id?: string }): Promise<boolean> => {
    try {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("partner_locations").update(rest).eq("id", id);
        if (error) throw error;
        toast.success("Local actualizado");
      } else {
        const { error } = await supabase.from("partner_locations").insert(payload);
        if (error) throw error;
        toast.success("Local creado");
      }
      return true;
    } catch (error: unknown) {
      toast.error("Error guardando local: " + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("partner_locations").delete().eq("id", id);
      if (error) throw error;
      toast.success("Local eliminado");
      return true;
    } catch (error: unknown) {
      toast.error("Error eliminando local: " + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };

  const loadLedger = useCallback(async (partnerId: string): Promise<PartnerLedgerEntry[]> => {
    try {
      const { data, error } = await supabase
        .from("partner_ledger")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PartnerLedgerEntry[];
    } catch (error: unknown) {
      if (!isMissingTable(error)) {
        toast.error("No se pudo cargar el historial: " + (error instanceof Error ? error.message : String(error)));
      }
      return [];
    }
  }, []);

  /** Registra un cobro (pickup): Mel recogió dinero del socio. */
  const registerPickup = async (partnerId: string, amountUsd: number, notes?: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("partner_ledger").insert({
        partner_id: partnerId,
        kind: "pickup",
        amount_usd: amountUsd,
        notes: notes?.trim() || null,
      });
      if (error) throw error;
      toast.success(`Cobro de $${amountUsd.toFixed(2)} USD registrado`);
      await load();
      return true;
    } catch (error: unknown) {
      toast.error("Error registrando cobro: " + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };

  /**
   * Datos de socios de un producto: precios por socio y stock por local.
   */
  const loadProductPartnerData = useCallback(async (productId: string): Promise<ProductPartnerData> => {
    const empty: ProductPartnerData = { prices: {}, stock: {} };
    try {
      const [{ data: pp, error: e1 }, { data: st, error: e2 }] = await Promise.all([
        supabase.from("product_partners").select("partner_id, partner_price").eq("product_id", productId),
        supabase.from("partner_location_stock").select("partner_location_id, quantity").eq("product_id", productId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const prices: Record<string, number> = {};
      ((pp ?? []) as ProductPartnerInfo[]).forEach((r) => { prices[r.partner_id] = Number(r.partner_price); });
      const stock: Record<string, number> = {};
      ((st ?? []) as { partner_location_id: string; quantity: number }[]).forEach((r) => {
        stock[r.partner_location_id] = Number(r.quantity ?? 0);
      });
      return { prices, stock };
    } catch (error: unknown) {
      if (!isMissingTable(error)) {
        toast.error("No se pudieron cargar los datos del socio: " + (error instanceof Error ? error.message : String(error)));
      }
      return empty;
    }
  }, []);

  /**
   * Guarda socios, precios y stock por local de un producto, y sincroniza
   * products.stock = own_stock + suma de stock en socios.
   * Devuelve el total sincronizado, o null si falló.
   */
  const saveProductPartnerData = async (
    productId: string,
    ownStock: number,
    partnerPrices: Record<string, number>,
    locationStock: Record<string, number>
  ): Promise<number | null> => {
    try {
      // 1. Socios del producto (precios)
      const { error: delPP } = await supabase.from("product_partners").delete().eq("product_id", productId);
      if (delPP) throw delPP;
      const ppRows = Object.entries(partnerPrices)
        .filter(([, price]) => Number(price) >= 0)
        .map(([partner_id, partner_price]) => ({ product_id: productId, partner_id, partner_price: Number(partner_price) }));
      if (ppRows.length > 0) {
        const { error } = await supabase.from("product_partners").insert(ppRows);
        if (error) throw error;
      }

      // 2. Stock por local del socio
      const { error: delSt } = await supabase.from("partner_location_stock").delete().eq("product_id", productId);
      if (delSt) throw delSt;
      const stRows = Object.entries(locationStock)
        .filter(([, q]) => Number(q) > 0)
        .map(([partner_location_id, quantity]) => ({ product_id: productId, partner_location_id, quantity: Number(quantity) }));
      if (stRows.length > 0) {
        const { error } = await supabase.from("partner_location_stock").insert(stRows);
        if (error) throw error;
      }

      // 3. Sincronizar totales del producto
      const partnerTotal = stRows.reduce((a, r) => a + r.quantity, 0);
      const total = Math.max(0, Number(ownStock ?? 0)) + partnerTotal;
      const { error: upd } = await supabase
        .from("products")
        .update({ stock: total, own_stock: Math.max(0, Number(ownStock ?? 0)) })
        .eq("id", productId);
      if (upd) throw upd;
      return total;
    } catch (error: unknown) {
      toast.error("Error guardando datos de socios: " + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  };

  /**
   * Descuenta unidades tras una venta y re-sincroniza products.stock.
   * source: { type: 'own' } | { type: 'partner', locationId }
   */
  const decrementStockForSale = async (
    productId: string,
    source: { type: "own" } | { type: "partner"; locationId: string },
    qty = 1
  ): Promise<boolean> => {
    try {
      if (source.type === "own") {
        const { data, error } = await supabase.from("products").select("stock, own_stock").eq("id", productId).single();
        if (error) throw error;
        const row = data as { stock: number | null; own_stock: number | null };
        const newOwn = Math.max(0, Number(row.own_stock ?? 0) - qty);
        // El total baja en la misma cantidad (los socios no cambian)
        const { error: upd } = await supabase
          .from("products")
          .update({ own_stock: newOwn, stock: Math.max(0, Number(row.stock ?? 0) - qty) })
          .eq("id", productId);
        if (upd) throw upd;
      } else {
        const { data, error } = await supabase
          .from("partner_location_stock")
          .select("quantity")
          .eq("product_id", productId)
          .eq("partner_location_id", source.locationId)
          .maybeSingle();
        if (error) throw error;
        const current = Number((data as { quantity: number } | null)?.quantity ?? 0);
        const next = Math.max(0, current - qty);
        if (next === 0) {
          const { error: del } = await supabase
            .from("partner_location_stock")
            .delete()
            .eq("product_id", productId)
            .eq("partner_location_id", source.locationId);
          if (del) throw del;
        } else {
          const { error: upd } = await supabase
            .from("partner_location_stock")
            .update({ quantity: next })
            .eq("product_id", productId)
            .eq("partner_location_id", source.locationId);
          if (upd) throw upd;
        }
        // Re-sincronizar el total
        const { data: prod, error: e2 } = await supabase.from("products").select("stock").eq("id", productId).single();
        if (e2) throw e2;
        const { error: upd2 } = await supabase
          .from("products")
          .update({ stock: Math.max(0, Number((prod as { stock: number | null }).stock ?? 0) - qty) })
          .eq("id", productId);
        if (upd2) throw upd2;
      }
      return true;
    } catch (error: unknown) {
      console.error("Error descontando stock:", error);
      return false;
    }
  };

  return {
    partners,
    balances,
    loading,
    needsMigration,
    refresh: load,
    savePartner,
    deletePartner,
    loadLocations,
    loadAllLocations,
    saveLocation,
    deleteLocation,
    loadLedger,
    registerPickup,
    loadProductPartnerData,
    saveProductPartnerData,
    decrementStockForSale,
  };
}

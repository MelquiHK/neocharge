import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Cashbox {
  /** Dinero físico en caja (editable por el dueño). */
  cash_usd: number;
  cash_cup: number;
  /** Lo ganado acumulado (editable por el dueño). */
  earned_usd: number;
  earned_cup: number;
  note: string;
  updated_at: string | null;
}

const CASHBOX_KEY = "cashbox";

const EMPTY: Cashbox = {
  cash_usd: 0,
  cash_cup: 0,
  earned_usd: 0,
  earned_cup: 0,
  note: "",
  updated_at: null,
};

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Caja del negocio. Se guarda en `site_settings` (clave "cashbox"),
 * el mismo sistema clave/valor que usa la tarifa de envío: no requiere
 * migraciones SQL. Solo el dueño la edita (controlado en la UI).
 */
export function useCashbox() {
  const [cashbox, setCashbox] = useState<Cashbox>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", CASHBOX_KEY)
      .maybeSingle();
    if (!error) {
      const v = (data?.value ?? {}) as Partial<Cashbox>;
      setCashbox({
        cash_usd: toNumber(v.cash_usd),
        cash_cup: toNumber(v.cash_cup),
        earned_usd: toNumber(v.earned_usd),
        earned_cup: toNumber(v.earned_cup),
        note: typeof v.note === "string" ? v.note : "",
        updated_at: typeof v.updated_at === "string" ? v.updated_at : null,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (next: Omit<Cashbox, "updated_at">) => {
    setSaving(true);
    const value = { ...next, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: CASHBOX_KEY, value }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error("Error guardando la caja: " + error.message);
      return false;
    }
    setCashbox(value);
    toast.success("Caja actualizada");
    return true;
  }, []);

  return { cashbox, loading, saving, save, refresh: load };
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExchangeRate {
  usd_to_cup: number;
  extra_cup_chargers: number;
  rate_date: string;
}

let cached: ExchangeRate | null = null;
let cachedAt = 0;
const TTL = 5 * 60 * 1000; // 5 min

export function useExchangeRate() {
  const [rate, setRate] = useState<ExchangeRate | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cached && Date.now() - cachedAt < TTL) {
      setRate(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error: queryError } = await supabase
          .from("exchange_rates")
          .select("usd_to_cup,extra_cup_chargers,rate_date")
          .order("rate_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (queryError) throw queryError;
        if (data) {
          cached = data as ExchangeRate;
          cachedAt = Date.now();
          setRate(cached);
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        // Si Supabase falla, la tasa queda en null y el error queda expuesto:
        // los precios en CUP no se inventan (ver computeDisplayPrice).
        console.error("No se pudo cargar la tasa de cambio:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rate, loading, error };
}

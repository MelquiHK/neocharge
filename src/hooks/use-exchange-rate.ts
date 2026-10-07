import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExchangeRate {
  usd_to_cup: number;
  extra_cup_chargers: number;
  rate_date: string;
}

let cached: ExchangeRate | null = null;
let inflight: Promise<ExchangeRate | null> | null = null;

/**
 * Invalida la tasa cacheada (llamar después de actualizarla en el admin).
 * La próxima lectura trae el valor fresco de la BD.
 */
export function refreshExchangeRate() {
  cached = null;
  inflight = null;
}

async function fetchRate(): Promise<ExchangeRate | null> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error: queryError } = await supabase
      .from("exchange_rates")
      .select("usd_to_cup,extra_cup_chargers,rate_date")
      .order("rate_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (queryError) throw queryError;
    if (data) cached = data as ExchangeRate;
    return cached;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function useExchangeRate() {
  const [rate, setRate] = useState<ExchangeRate | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fuente única por sesión: todos los componentes comparten el mismo
    // valor cacheado; sin TTL que sirva 780 a unos y 790 a otros.
    if (cached) {
      setRate(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchRate();
        if (cancelled) return;
        setRate(fresh);
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

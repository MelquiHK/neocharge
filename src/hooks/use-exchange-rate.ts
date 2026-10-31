import { useEffect, useState } from "react";
import { getSupabase } from "@/integrations/supabase/lazy-client";
import { fetchWithCache, CACHE_KEYS } from "@/lib/offline-cache";

export interface ExchangeRate {
  usd_to_cup: number;
  extra_cup_chargers: number;
  rate_date: string;
  /** Tasa EUR/CUP de elTOQUE (sin extra). null si aún no está disponible:
   * la columna eur_to_cup puede no existir todavía en la BD o el ajuste
   * 'eur_rate' de site_settings no haberse guardado nunca. Sin EUR no se
   * inventa equivalencia: las líneas en euros simplemente se omiten. */
  eur_to_cup: number | null;
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
    // El cliente Supabase se carga bajo demanda (chunk asíncrono, fuera del
    // bundle inicial) para no bloquear el primer paint.
    // Offline: se sirve la última tasa guardada.
    const { data } = await fetchWithCache<ExchangeRate>(CACHE_KEYS.exchangeRate, async () => {
      const supabase = await getSupabase();
      // 1) Tasa USD (+ EUR si la columna eur_to_cup ya existe en la BD).
      // Si la columna aún no se ha creado, PostgREST rechaza el select
      // entero: se reintenta con el select clásico para no romper la USD.
      let row: Record<string, unknown> | null = null;
      const withEur = await supabase
        .from("exchange_rates")
        .select("usd_to_cup,extra_cup_chargers,rate_date,eur_to_cup")
        .order("rate_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!withEur.error && withEur.data) {
        row = withEur.data as Record<string, unknown>;
      } else {
        const legacy = await supabase
          .from("exchange_rates")
          .select("usd_to_cup,extra_cup_chargers,rate_date")
          .order("rate_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (legacy.error) throw legacy.error;
        row = legacy.data as Record<string, unknown> | null;
      }
      if (!row) return null;
      let eur = Number(row.eur_to_cup);
      // 2) Fallback EUR: ajuste 'eur_rate' en site_settings (lo guarda el
      // panel admin junto a la tasa USD; misma tabla genérica que ya usa
      // delivery_config/cashbox). Solo si la columna no trajo valor.
      if (!Number.isFinite(eur) || eur <= 0) {
        eur = NaN;
        try {
          const { data: setting } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "eur_rate")
            .maybeSingle();
          const v = (setting as { value?: { eur_to_cup?: unknown } } | null)?.value;
          const fromSettings = Number(v?.eur_to_cup);
          if (Number.isFinite(fromSettings) && fromSettings > 0) eur = fromSettings;
        } catch {
          // Sin EUR disponible: se omite la equivalencia, no se inventa.
        }
      }
      return {
        usd_to_cup: Number(row.usd_to_cup),
        extra_cup_chargers: Number(row.extra_cup_chargers),
        rate_date: String(row.rate_date),
        eur_to_cup: Number.isFinite(eur) && eur > 0 ? eur : null,
      } as ExchangeRate;
    });
    if (data) cached = data;
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

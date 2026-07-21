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

  useEffect(() => {
    if (cached && Date.now() - cachedAt < TTL) {
      setRate(cached);
      setLoading(false);
      return;
    }
    supabase
      .from("exchange_rates")
      .select("usd_to_cup,extra_cup_chargers,rate_date")
      .order("rate_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          cached = data as ExchangeRate;
          cachedAt = Date.now();
          setRate(cached);
        }
        setLoading(false);
      });
  }, []);

  return { rate, loading };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryQuote {
  km: number;
  priceCUP: number;
  pricePerKm: number;
  /**
   * true cuando el demo público de OSRM no respondió y se usó la
   * estimación local (línea recta × factor de carretera). El precio
   * final del envío se confirma por WhatsApp; nunca bloquea la venta.
   */
  approximate: boolean;
}

// Mismo origen y tarifa que /calcular-envio (site_settings.delivery_config).
const DEFAULT_ORIGIN = { lat: 23.13474182, lng: -82.39116033 };
const FALLBACK_RATE = 250;
// La distancia por carretera suele superar a la línea recta: factor de
// corrección para la estimación local cuando OSRM no responde.
const ROAD_FACTOR = 1.3;
const OSRM_TIMEOUT_MS = 8000;

/**
 * Distancia en línea recta (fórmula haversiana). Solo se usa como
 * respaldo local cuando el demo público de OSRM falla o expira.
 */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Cotiza el envío por carretera (OSRM) desde el local origen hasta unas
 * coordenadas, usando la tarifa CUP/km configurada en el panel.
 * Misma fuente de verdad que la calculadora pública /calcular-envio.
 */
export function useDeliveryQuote() {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [pricePerKm, setPricePerKm] = useState(FALLBACK_RATE);
  const [configError, setConfigError] = useState<string | null>(null);
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quotedCoords, setQuotedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: cfg }, { data: points }] = await Promise.all([
          supabase.from("site_settings").select("value").eq("key", "delivery_config").maybeSingle(),
          supabase.from("sale_points").select("id,name,lat,lng").eq("is_active", true),
        ]);
        const price = Number((cfg?.value as { price_per_km?: unknown } | null)?.price_per_km);
        if (Number.isFinite(price) && price > 0) setPricePerKm(price);

        const originId = (cfg?.value as { origin_sale_point_id?: unknown } | null)?.origin_sale_point_id;
        const pts = ((points ?? []) as { id: unknown; name: string; lat: unknown; lng: unknown }[])
          .map((p) => ({ id: String(p.id), name: p.name, lat: Number(p.lat), lng: Number(p.lng) }))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        const pick =
          pts.find((p) => p.id === String(originId)) ??
          pts.find((p) => /vedado/i.test(p.name)) ??
          pts[0];
        if (pick) setOrigin({ lat: pick.lat, lng: pick.lng });
      } catch {
        // No se pudo leer la configuración: se avisa honestamente y se usan
        // los valores por defecto (tarifa estándar 250 CUP/km, origen Vedado).
        setConfigError("No pudimos cargar la tarifa de envío configurada; se usa la tarifa estándar.");
      }
    };
    load();
  }, []);

  const clearQuote = useCallback(() => {
    setQuote(null);
    setQuotedCoords(null);
    setQuoteError(null);
  }, []);

  const quoteFor = useCallback(
    async (lat: number, lng: number): Promise<DeliveryQuote | null> => {
      setQuoting(true);
      setQuoteError(null);
      try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), OSRM_TIMEOUT_MS);
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${lng},${lat}?overview=false`,
            { signal: ctrl.signal },
          );
          const data = await res.json();
          if (data.code === "Ok" && data.routes?.[0]) {
            const km = data.routes[0].distance / 1000;
            const q: DeliveryQuote = {
              km,
              priceCUP: Math.round(km * pricePerKm),
              pricePerKm,
              approximate: false,
            };
            setQuote(q);
            setQuotedCoords({ lat, lng });
            return q;
          }
          throw new Error("OSRM sin ruta");
        } finally {
          window.clearTimeout(timer);
        }
      } catch {
        // Respaldo local: el demo público de OSRM puede caer, limitar el uso
        // o tardar demasiado. Mejor una estimación honesta marcada como
        // aproximada que bloquear la venta del cliente.
        const km = haversineKm(origin.lat, origin.lng, lat, lng) * ROAD_FACTOR;
        const q: DeliveryQuote = {
          km,
          priceCUP: Math.round(km * pricePerKm),
          pricePerKm,
          approximate: true,
        };
        setQuote(q);
        setQuotedCoords({ lat, lng });
        return q;
      } finally {
        setQuoting(false);
      }
    },
    [origin, pricePerKm],
  );

  return { origin, pricePerKm, configError, quote, quotedCoords, quoting, quoteError, quoteFor, clearQuote };
}

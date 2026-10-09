import { useEffect, useState } from "react";
import { getConnectionQuality, type ConnectionQuality } from "@/lib/offline/connection";

/**
 * Calidad de conexión en vivo: "online" | "degraded" | "offline".
 * Se reevalúa al cambiar la conexión (online/offline) y periódicamente
 * (por si navigator.onLine miente y nada carga de verdad).
 */
export function useConnectionQuality(): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>(
    typeof navigator === "undefined" || navigator.onLine ? "online" : "offline",
  );

  useEffect(() => {
    let cancelled = false;
    const evaluate = async (probe: boolean) => {
      const q = await getConnectionQuality(probe);
      if (!cancelled) setQuality(q);
    };
    // Evaluación inicial con medición real (barata: un HEAD al origen).
    void evaluate(true);
    const onChange = () => void evaluate(false);
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    // Re-chequeo cada 2 minutos por si la red "existe" pero no sirve.
    const id = window.setInterval(() => void evaluate(true), 2 * 60 * 1000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
      window.clearInterval(id);
    };
  }, []);

  return quality;
}

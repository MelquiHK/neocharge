import { useEffect, useState } from "react";
import { WifiOff, SignalLow } from "lucide-react";
import { useConnectionQuality } from "@/hooks/use-connection-quality";
import { getCacheSavedAt, CACHE_KEYS } from "@/lib/offline-cache";

/**
 * Aviso honesto sobre el estado de la conexión:
 * - Sin conexión: dice de qué fecha son los datos guardados que se muestran.
 * - Conexión lenta: avisa que se usan los datos guardados para no esperar.
 * Con buena conexión no se muestra nada.
 */
export function OfflineBanner() {
  const quality = useConnectionQuality();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (quality === "online") return;
    let cancelled = false;
    void getCacheSavedAt(CACHE_KEYS.products).then((ts) => {
      if (!cancelled) setSavedAt(ts);
    });
    return () => {
      cancelled = true;
    };
  }, [quality]);

  if (quality === "online") return null;

  const dateStr = savedAt
    ? new Date(savedAt).toLocaleDateString("es-CU", { day: "numeric", month: "numeric", year: "numeric" })
    : null;

  const isOffline = quality === "offline";
  return (
    <div
      role="status"
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-900/95 text-white text-sm font-medium shadow-xl shadow-brand-900/30 backdrop-blur animate-fade-in-down"
    >
      {isOffline ? <WifiOff className="w-4 h-4 shrink-0" /> : <SignalLow className="w-4 h-4 shrink-0" />}
      <span>
        {isOffline ? "Sin conexión" : "Conexión lenta"}
        {dateStr ? ` — mostrando datos del ${dateStr}` : " — mostrando datos guardados"}
      </span>
    </div>
  );
}

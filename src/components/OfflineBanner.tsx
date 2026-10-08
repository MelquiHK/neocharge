import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/use-online";

/**
 * Aviso discreto cuando no hay conexión: la tienda muestra los datos
 * guardados en el teléfono.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-900/95 text-white text-sm font-medium shadow-xl shadow-brand-900/30 backdrop-blur animate-fade-in-down"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Sin conexión — mostrando datos guardados</span>
    </div>
  );
}

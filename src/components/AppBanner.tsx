import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "nc-appbanner-dismissed";
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

interface AppBannerProps {
  onVisibilityChange?: (visible: boolean) => void;
}

/**
 * Smart-banner dismissible que invita a descargar la app de NeoCharge.
 * No se muestra si: el usuario la cerró, la ruta es /descargar-app, o es iOS.
 */
export function AppBanner({ onVisibilityChange }: AppBannerProps) {
  const location = useLocation();
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1") {
        return false;
      }
    } catch {
      return false;
    }
    if (typeof navigator !== "undefined" && isIOS()) return false;
    return true;
  });

  const show = visible && location.pathname !== "/descargar-app";

  useEffect(() => {
    onVisibilityChange?.(show);
  }, [show, onVisibilityChange]);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* almacenamiento no disponible: se oculta igual */
    }
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Descarga la app de NeoCharge"
      className="fixed top-0 left-0 right-0 z-[60] h-14 overflow-hidden"
    >
      {/* Degradado azul con vidrio */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-600" />
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md" />
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/25 blur-2xl"
        aria-hidden
      />

      <div className="relative h-full container-page flex items-center gap-3 text-white">
        <span className="hidden sm:flex w-9 h-9 shrink-0 rounded-xl bg-white/20 border border-white/30 items-center justify-center">
          <Smartphone className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-bold text-sm truncate">Descarga la app de NeoCharge</p>
          <p className="text-[11px] text-white/85 truncate">
            Compra más cómodo · Android 10 o superior
          </p>
        </div>
        <Link
          to="/descargar-app"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-blue-700 text-sm font-bold px-4 py-1.5 shadow-lg hover:bg-blue-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Descargar
        </Link>
        <button
          onClick={dismiss}
          aria-label="Cerrar aviso de la app"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

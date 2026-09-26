import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Download, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "nc-appbanner-dismissed";
const DOWNLOADED_KEY = "nc-app-downloaded";
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

/** True cuando la página corre dentro del WebView de la app (Capacitor inyecta window.Capacitor). */
const isInsideApp = () =>
  typeof window !== "undefined" && Boolean((window as unknown as { Capacitor?: unknown }).Capacitor);

function shouldHide(): boolean {
  try {
    if (typeof localStorage !== "undefined") {
      if (localStorage.getItem(DISMISS_KEY) === "1") return true;
      if (localStorage.getItem(DOWNLOADED_KEY) === "1") return true;
    }
  } catch {
    return true;
  }
  if (typeof navigator !== "undefined" && isIOS()) return true;
  if (isInsideApp()) return true;
  return false;
}

/**
 * Burbuja flotante que invita a descargar la app de NeoCharge.
 * No desplaza el layout: flota abajo a la derecha.
 * No se muestra si: el usuario la cerró, ya descargó la app, corre dentro
 * de la app, la ruta es /descargar-app, o es iOS.
 */
export function AppBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState<boolean>(() => !shouldHide());
  const [expanded, setExpanded] = useState(false);

  const show = visible && location.pathname !== "/descargar-app";
  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* almacenamiento no disponible: se oculta igual */
    }
    setVisible(false);
  };

  const goDownload = () => {
    try {
      localStorage.setItem(DOWNLOADED_KEY, "1");
    } catch {
      /* sigue navegando aunque no se pueda guardar */
    }
    setVisible(false);
    navigate("/descargar-app");
  };

  return (
    <div
      role="region"
      aria-label="Descarga la app de NeoCharge"
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex justify-center sm:justify-end pointer-events-none"
    >
      <div className="pointer-events-auto relative w-full sm:w-auto sm:max-w-xs">
        {/* Tarjeta expandida con detalles */}
        <div
          className={cn(
            "absolute bottom-full right-0 mb-3 w-full sm:w-80 origin-bottom-right transition-all duration-300",
            expanded
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-2 pointer-events-none"
          )}
          aria-hidden={!expanded}
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white shadow-2xl shadow-blue-900/40 border border-white/20">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
            <div
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/20 blur-3xl"
              aria-hidden
            />
            <div className="relative p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 shrink-0 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                    <Zap className="w-6 h-6 text-blue-600" fill="currentColor" />
                  </span>
                  <div className="leading-tight">
                    <p className="font-extrabold">App NeoCharge</p>
                    <p className="text-[11px] text-white/80">Tu tienda en el bolsillo</p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  aria-label="Cerrar aviso de la app"
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/85 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ul className="mt-4 space-y-2 text-[13px] text-white/90">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-300" />
                  Solo ~5.7 MB · Android 10 o superior
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-300" />
                  Sin internet se ve todo; con internet se compra
                </li>
              </ul>

              <button
                onClick={goDownload}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-blue-700 font-extrabold py-3 shadow-lg hover:bg-blue-50 active:scale-[0.98] transition"
              >
                <Download className="w-5 h-5" /> Descargar APK
              </button>
            </div>
          </div>
        </div>

        {/* Burbuja colapsada */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          aria-expanded={expanded}
          aria-label="Más información sobre la app de NeoCharge"
          className="w-full sm:w-auto flex items-center gap-3 rounded-full pl-2 pr-2 py-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-900/40 border border-white/25 backdrop-blur-xl hover:shadow-blue-900/60 active:scale-[0.98] transition-all cursor-pointer"
        >
          <span className="w-9 h-9 shrink-0 rounded-full bg-white flex items-center justify-center shadow">
            <Zap className="w-5 h-5 text-blue-600" fill="currentColor" />
          </span>
          <span className="flex-1 sm:flex-none text-left leading-tight min-w-0">
            <span className="block text-sm font-extrabold truncate">App NeoCharge</span>
            <span className="block text-[11px] text-white/80">Toca para ver detalles</span>
          </span>
          <Link
            to="/descargar-app"
            onClick={(e) => {
              e.stopPropagation();
              try {
                localStorage.setItem(DOWNLOADED_KEY, "1");
              } catch {
                /* sigue navegando */
              }
              setVisible(false);
            }}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-blue-700 text-sm font-bold px-4 py-2 shadow hover:bg-blue-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Descargar
          </Link>
          <span
            role="button"
            tabIndex={0}
            aria-label="Cerrar aviso de la app"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                dismiss();
              }
            }}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/85 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

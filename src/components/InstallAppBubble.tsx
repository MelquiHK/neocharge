import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const DISMISS_KEY = "nc-install-bubble-dismissed";
const DISMISS_DAYS = 7;

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Páginas donde la burbuja nunca debe aparecer: estorbaría la conversión
// (en /checkout llegó a tapar la opción "Mensajería a domicilio").
const HIDDEN_PATHS = ["/descargar-app", "/checkout"];

/**
 * Burbuja compacta que invita a instalar la app de NeoCharge.
 * - Pequeña y abajo a la derecha: no tapa CTAs ni contenido central.
 * - Solo aparece si la app NO está instalada y el usuario no la descartó.
 * - Al cerrarla con la X no vuelve a aparecer en 7 días (localStorage).
 * - Al tocarla lleva a /descargar-app.
 */
export function InstallAppBubble() {
  const { installed } = usePwaInstall();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);

  const hiddenHere = HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (installed || gone || hiddenHere) return;
    if (dismissedRecently()) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [installed, gone, hiddenHere, pathname]);

  // Si cambia de página a una oculta, esconder de inmediato.
  useEffect(() => {
    if (hiddenHere) setVisible(false);
  }, [hiddenHere]);

  if (!visible || installed || gone || hiddenHere) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* sin almacenamiento, se oculta igual en esta sesión */
    }
    setGone(true);
    setVisible(false);
  };

  return (
    <div className={`fixed right-4 z-40 flex items-center gap-1 rounded-full glass-strong text-slate-900 shadow-glow-brand-sm border border-brand-400/40 pl-1.5 pr-1 py-1.5 animate-in slide-in-from-bottom-4 duration-500 ${
      // En la ficha de producto el botón flotante de WhatsApp ocupa
      // bottom-right: la burbuja sube para no taparlo.
      pathname.startsWith("/producto/") ? "bottom-20" : "bottom-4"
    }`}>
      <button
        type="button"
        onClick={() => navigate("/descargar-app")}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-slate-900/5 transition-colors"
        aria-label="Instalar la app de NeoCharge"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-300 via-brand-400 to-brand-500 flex items-center justify-center shrink-0 shadow-glow-brand-sm">
          <Smartphone className="w-4 h-4 text-slate-900" />
        </span>
        <span className="text-xs font-bold whitespace-nowrap">Instalar app</span>
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 shrink-0 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

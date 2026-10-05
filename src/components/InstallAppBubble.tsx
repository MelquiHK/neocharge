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

/**
 * Burbuja flotante que invita a instalar la app de NeoCharge.
 * Solo aparece si la app NO está instalada y el usuario no la descartó
 * recientemente. Al tocarla lleva a /descargar-app.
 */
export function InstallAppBubble() {
  const { installed } = usePwaInstall();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (installed || gone) return;
    if (pathname === "/descargar-app") return;
    if (dismissedRecently()) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [installed, gone, pathname]);

  if (!visible || installed || gone || pathname === "/descargar-app") return null;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* sin almacenamiento, se oculta igual en esta sesión */
    }
    setGone(true);
  };

  return (
    <button
      type="button"
      onClick={() => navigate("/descargar-app")}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pl-2 pr-2 py-2 rounded-full glass-strong text-slate-900 shadow-glow-brand-sm border border-brand-400/40 animate-in slide-in-from-bottom-4 duration-500 max-w-[92vw]"
      aria-label="Instalar la app de NeoCharge"
    >
      <span className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-300 via-brand-400 to-brand-500 flex items-center justify-center shrink-0 shadow-glow-brand-sm">
        <Smartphone className="w-5 h-5 text-slate-900" />
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-bold">Instala la app de NeoCharge</span>
        <span className="block text-[11px] text-slate-500">Compra más rápido desde tu inicio</span>
      </span>
      <span
        role="button"
        tabIndex={0}
        aria-label="Cerrar aviso"
        onClick={dismiss}
        onKeyDown={(e) => e.key === "Enter" && dismiss(e as unknown as React.MouseEvent)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 shrink-0"
      >
        <X className="w-4 h-4" />
      </span>
    </button>
  );
}

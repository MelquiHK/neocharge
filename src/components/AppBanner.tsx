import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, Zap } from "lucide-react";
import "@/components/sections/visual-effects.css";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISS_KEY = "nc-app-banner-dismissed";

function isAndroid(): boolean {
  const ua = navigator.userAgent || "";
  return /Android/.test(ua);
}

/**
 * Smart banner fijo que promociona el APK de NeoCharge (solo Android).
 * Dismissible (localStorage) y con soporte de beforeinstallprompt en Chrome:
 * si el navegador ofrece instalación nativa, el botón "Descargar" dispara prompt().
 */
export function AppBanner() {
  const [visible, setVisible] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Solo Android: en iPhone/escritorio no se muestra nada.
    if (!isAndroid()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    setVisible(true);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    const p = deferredPrompt.current;
    // Si Chrome ofrece instalación nativa, úsala en vez de navegar.
    if (p) {
      e.preventDefault();
      deferredPrompt.current = null;
      setHasPrompt(false);
      await p.prompt();
      await p.userChoice;
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-50">
      <div className="nc-liquid rounded-2xl border border-white/15 bg-[#08080d]/85 backdrop-blur-md px-4 py-3 flex items-center gap-3 shadow-2xl">
        <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-[#a3e635] text-[#0c0c14]">
          <Zap className="w-5 h-5" fill="currentColor" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">App de NeoCharge</p>
          <p className="text-xs text-white/70 leading-tight">Descarga la app de NeoCharge — compra más cómodo</p>
        </div>
        <Link
          to="/descargar-app"
          onClick={handleDownload}
          className="shrink-0 bg-[#a3e635] text-[#0c0c14] hover:bg-[#bef264] font-bold rounded-xl px-4 py-2 text-sm animate-pulse-glow"
        >
          Descargar
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso de la app"
          className="shrink-0 text-white/60 hover:text-white rounded-lg p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

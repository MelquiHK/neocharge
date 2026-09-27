import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** El evento capturado sobrevive a la navegación porque la SPA no recarga la ventana. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  // PWA instalada (Android/escritorio)
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS "Añadir a pantalla de inicio"
  if ((window.navigator as unknown as { standalone?: boolean }).standalone === true)
    return true;
  // App nativa (APK Capacitor): el WebView no reporta display-mode,
  // pero el puente de Capacitor sí sabe que corre en nativo.
  const cap = (
    window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor;
  if (cap && typeof cap.isNativePlatform === "function") {
    try {
      if (cap.isNativePlatform()) return true;
    } catch {
      /* noop */
    }
  }
  // Cinturón y tirantes: WebView de Android
  if (/; wv\)/i.test(navigator.userAgent)) return true;
  return false;
}

/**
 * Estado de instalación de la PWA de NeoCharge.
 * - `installed`: ya está instalada (modo standalone).
 * - `canInstall`: el navegador permite el prompt nativo de instalación.
 * - `isIOS`: iPhone/iPad (no hay prompt nativo, se dan instrucciones).
 * - `promptInstall()`: dispara el diálogo nativo de instalación.
 */
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(detectInstalled);
  const [isIOS] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream
  );

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredPrompt = null;
      setCanInstall(false);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
    return outcome === "accepted";
  }, []);

  return { canInstall, installed, isIOS, promptInstall };
}

import { Suspense, lazy, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InstallAppBubble } from "@/components/InstallAppBubble";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Outlet } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { ensureNcFx } from "@/lib/fly-to-cart";
import { seedFromBundle } from "@/lib/offline-cache";
import { Info } from "lucide-react";

// El sheet del carrito (y con él radix dialog/sheet) NO va en el bundle
// inicial: se carga la primera vez que el usuario abre el carrito y queda
// montado desde entonces (se conserva la animación de cierre).
const CartSheet = lazy(() => import("@/components/CartSheet"));

export function SiteLayout() {
  const { paymentCurrency, isOpen } = useCart();
  const [sheetReady, setSheetReady] = useState(false);

  useEffect(() => {
    // Los keyframes del fly-to-cart deben existir desde el primer paint
    // (antes se inyectaban al montar el CartSheet).
    ensureNcFx();
    // Siembra la base de datos local desde el archivo empaquetado en la app:
    // así hay productos aunque sea la primera vez y no haya internet.
    void seedFromBundle();
    // Precarga el chunk del carrito en idle: la primera apertura es
    // instantánea y nunca suspende dentro del clic (React #306).
    const preload = () => import("@/components/CartSheet");
    if ("requestIdleCallback" in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(() => { void preload(); }, { timeout: 4000 });
      return () => (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => { void preload(); }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isOpen) setSheetReady(true);
  }, [isOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Currency Notice */}
      <div className="bg-brand-200/50 border-b border-brand-400/25 py-2 hidden md:block backdrop-blur-xl">
        <div className="container-page flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-800">
          <Info className="w-3 h-3" />
          Precios actualizados · Pagos aceptados en {paymentCurrency === "USD" ? "USD y CUP" : "CUP y USD"} · Entrega en 24h
        </div>
      </div>
      
      <Header className="top-0 md:top-10" />
      <OfflineBanner />
      <main className="flex-1 pt-24 md:pt-36">
        <Outlet />
      </main>
      <Footer />
      {sheetReady && (
        <Suspense fallback={null}>
          <CartSheet />
        </Suspense>
      )}
      <InstallAppBubble />
    </div>
  );
}

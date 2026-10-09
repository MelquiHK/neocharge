import { useEffect, useState, type ComponentType } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InstallAppBubble } from "@/components/InstallAppBubble";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Outlet } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { ensureNcFx } from "@/lib/fly-to-cart";
import { seedFromBundle } from "@/lib/offline-cache";
import { captureRefFromUrl } from "@/lib/referral";
import { Info } from "lucide-react";

// El drawer del carrito va en chunk separado, pero SIN React.lazy():
// el lazy() suspende en su primer render y eso rompía la app con el
// error #306 al abrir el carrito. En su lugar se carga el módulo con
// import() y se guarda el componente ya resuelto en estado: el render
// nunca suspende y el #306 es imposible.
type CartSheetComponent = ComponentType;
let cartSheetPromise: Promise<CartSheetComponent> | null = null;
function getCartSheet(): Promise<CartSheetComponent> {
  if (!cartSheetPromise) {
    cartSheetPromise = import("@/components/CartSheet").then((m) => m.CartSheet);
  }
  return cartSheetPromise;
}

export function SiteLayout() {
  const { paymentCurrency, isOpen } = useCart();
  const { rate } = useExchangeRate();
  const [CartSheetComp, setCartSheetComp] = useState<CartSheetComponent | null>(null);

  useEffect(() => {
    // Los keyframes del fly-to-cart deben existir desde el primer paint
    // (antes se inyectaban al montar el CartSheet).
    ensureNcFx();
    // Siembra la base de datos local desde el archivo empaquetado en la app:
    // así hay productos aunque sea la primera vez y no haya internet.
    void seedFromBundle();
    // Precarga el chunk del carrito en idle: la primera apertura es
    // instantánea (el módulo ya está evaluado cuando el usuario hace clic).
    const preload = () => { void getCartSheet(); };
    // Programa de referidos: captura ?ref=CODIGO una sola vez por carga.
    void captureRefFromUrl();
    if ("requestIdleCallback" in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(() => { void preload(); }, { timeout: 4000 });
      return () => (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => { void preload(); }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  // El drawer se monta cuando su componente ya está resuelto.
  // Como no hay lazy(), este setState nunca provoca una suspensión.
  useEffect(() => {
    if (!isOpen || CartSheetComp) return;
    let cancelled = false;
    getCartSheet().then(
      (Comp) => { if (!cancelled) setCartSheetComp(() => Comp); },
      (err) => { console.error("[cart] no se pudo cargar el drawer:", err); },
    );
    return () => { cancelled = true; };
  }, [isOpen, CartSheetComp]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Currency Notice */}
      <div className="bg-brand-200/50 border-b border-brand-400/25 py-2 hidden md:block backdrop-blur-xl">
        <div className="container-page flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-800">
          <Info className="w-3 h-3" />
          Precios actualizados · Tasa hoy: {rate ? `${Math.round(rate.usd_to_cup)} CUP/USD · elTOQUE` : "—"} · Pagos aceptados en {paymentCurrency === "USD" ? "USD y CUP" : "CUP y USD"} · Entrega en 24h
        </div>
      </div>
      
      <Header className="top-0 md:top-10" />
      <OfflineBanner />
      <main className="flex-1 pt-24 md:pt-36">
        <Outlet />
      </main>
      <Footer />
      {CartSheetComp ? <CartSheetComp /> : null}
      <InstallAppBubble />
    </div>
  );
}

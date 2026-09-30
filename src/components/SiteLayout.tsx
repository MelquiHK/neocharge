import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartSheet } from "@/components/CartSheet";
import { InstallAppBubble } from "@/components/InstallAppBubble";
import { Outlet } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { Info } from "lucide-react";

export function SiteLayout() {
  const { paymentCurrency } = useCart();

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
      <main className="flex-1 pt-24 md:pt-36">
        <Outlet />
      </main>
      <Footer />
      <CartSheet />
      <InstallAppBubble />
    </div>
  );
}

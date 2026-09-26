import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartSheet } from "@/components/CartSheet";
import { AppBanner } from "@/components/AppBanner";
import { Outlet } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/components/sections/crystal.css";

export function SiteLayout() {
  const { paymentCurrency } = useCart();
  const [bannerVisible, setBannerVisible] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <AppBanner onVisibilityChange={setBannerVisible} />

      {/* Global Currency Notice */}
      {!bannerVisible && (
        <div className="bg-primary/5 border-b border-primary/10 py-2 hidden md:block">
          <div className="container-page flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-primary/70">
            <Info className="w-3 h-3" />
            Precios actualizados · Pagos aceptados en {paymentCurrency === "USD" ? "USD, CUP y MLC" : "CUP, USD y MLC"} · Entrega en 24h
          </div>
        </div>
      )}

      <Header className={bannerVisible ? "top-14" : "top-0 md:top-10"} />
      <main className={cn("flex-1 pt-24 md:pt-36", bannerVisible && "pt-[152px] md:pt-[200px]")}>
        <Outlet />
      </main>
      <Footer />
      <CartSheet />
    </div>
  );
}

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartSheet } from "@/components/CartSheet";
import { Outlet } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Info } from "lucide-react";

export function SiteLayout() {
  const { paymentCurrency } = useCart();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Currency Notice */}
      <div className="bg-primary/5 border-b border-primary/10 py-2 hidden md:block">
        <div className="container-page flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-primary/70">
          <Info className="w-3 h-3" />
          Precios actualizados · Pagos aceptados en {paymentCurrency === "USD" ? "USD, CUP y MLC" : "CUP, USD y MLC"} · Entrega en 24h
        </div>
      </div>
      
      <Header className="top-0 md:top-8" />
      <main className="flex-1 pt-24 md:pt-32">
        <Outlet />
      </main>
      <Footer />
      <CartSheet />
    </div>
  );
}

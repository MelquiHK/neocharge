import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartSheet } from "@/components/CartSheet";
import { Outlet } from "react-router-dom";

export function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24">
        <Outlet />
      </main>
      <Footer />
      <CartSheet />
    </div>
  );
}

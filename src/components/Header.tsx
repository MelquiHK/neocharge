import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, User, X, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import "@/components/sections/visual-effects.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/tienda", label: "Tienda" },
  { to: "/favoritos", label: "Favoritos" },
  { to: "/servicios", label: "Servicios" },
  { to: "/calcular-envio", label: "Calcular envío" },
  { to: "/garantia", label: "Garantía" },
  { to: "/blog", label: "Blog" },
  { to: "/sobre-nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
];

export function Header({ className }: { className?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [bump, setBump] = useState(false);
  const [prevCount, setPrevCount] = useState(itemCount);

  useEffect(() => {
    if (itemCount > prevCount) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      setPrevCount(itemCount);
      return () => clearTimeout(t);
    }
    setPrevCount(itemCount);
  }, [itemCount, prevCount]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 z-50 transition-all duration-500",
        scrolled ? "py-2" : "py-4",
        className || "top-0",
      )}
    >
      <div className="container-page">
        <div
          className={cn(
            "flex items-center justify-between rounded-full transition-all duration-500 px-4 sm:px-6 bg-[#08080d]/80 backdrop-blur-xl border-b border-white/10",
            scrolled
              ? "border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.55)] h-16"
              : "border border-white/10 h-20",
          )}
        >
          <Logo />

          <nav className="hidden lg:flex items-center gap-1" aria-label="Principal">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "group px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 relative",
                    isActive
                      ? "text-[#a3e635]"
                      : "text-slate-300 hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-[#a3e635] shadow-[0_0_12px_rgba(163,230,53,0.9)] transition-all duration-300 origin-center",
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-slate-200 hover:text-lime-300 hover:bg-white/10"
                    aria-label="Cuenta"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl bg-[#0c0c14]/95 backdrop-blur-xl border-white/10 text-slate-200"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold truncate">{user.email}</span>
                      {isAdmin && (
                        <span className="text-xs text-[#a3e635] font-semibold mt-0.5">Administrador</span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild>
                    <Link to="/cuenta" className="cursor-pointer focus:bg-white/10 focus:text-lime-300">
                      <User className="w-4 h-4 mr-2" /> Mi cuenta
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer focus:bg-white/10 focus:text-lime-300">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Panel admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer focus:bg-white/10">
                    <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex rounded-full text-slate-200 hover:text-lime-300 hover:bg-white/10"
              >
                <Link to="/auth">Iniciar sesión</Link>
              </Button>
            )}

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative rounded-full h-10 w-10 flex items-center justify-center text-slate-200 hover:text-lime-300 hover:bg-white/10 transition-colors"
              aria-label={`Carrito (${itemCount} productos)`}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-[#a3e635] text-[#0c0c14] text-[10px] font-bold flex items-center justify-center shadow-[0_0_12px_rgba(163,230,53,0.8)]",
                    bump && "animate-bump",
                  )}
                >
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden rounded-full h-10 w-10 flex items-center justify-center text-slate-200 hover:text-lime-300 hover:bg-white/10 transition-colors"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="lg:hidden mt-3 rounded-3xl p-4 shadow-[0_16px_50px_rgba(0,0,0,0.6)] animate-fade-in bg-[#08080d]/90 backdrop-blur-xl border border-white/10">
            <nav className="flex flex-col gap-1" aria-label="Móvil">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "px-4 py-3 rounded-xl text-base font-medium transition-colors",
                      isActive
                        ? "bg-[#a3e635]/10 text-[#a3e635]"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {!user && (
                <NavLink
                  to="/auth"
                  className="px-4 py-3 rounded-xl text-base font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  Iniciar sesión
                </NavLink>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, User, X, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
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
            "flex items-center justify-between rounded-full transition-all duration-500 px-4 sm:px-6",
            scrolled
              ? "glass shadow-xl h-16 border-white/20"
              : "bg-white/5 backdrop-blur-md border border-white/10 h-20",
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
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative",
                    isActive
                      ? "text-primary"
                      : "text-foreground/80 hover:text-foreground hover:bg-secondary/60",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
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
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Cuenta">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold truncate">{user.email}</span>
                      {isAdmin && (
                        <span className="text-xs text-accent font-semibold mt-0.5">Administrador</span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/cuenta" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Mi cuenta
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Panel admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full">
                <Link to="/auth">Iniciar sesión</Link>
              </Button>
            )}

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative rounded-full h-10 w-10 flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label={`Carrito (${itemCount} productos)`}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-gradient-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center shadow-glow-accent",
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
              className="lg:hidden rounded-full h-10 w-10 flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="lg:hidden mt-3 glass rounded-3xl p-4 shadow-lifted animate-fade-in">
            <nav className="flex flex-col gap-1" aria-label="Móvil">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "px-4 py-3 rounded-xl text-base font-medium transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary",
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {!user && (
                <NavLink
                  to="/auth"
                  className="px-4 py-3 rounded-xl text-base font-medium hover:bg-secondary"
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

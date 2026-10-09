import { Suspense, lazy, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { WelcomeTransition, type WelcomeData } from "@/components/WelcomeTransition";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { cn } from "@/lib/utils";

// El menú de cuenta (radix dropdown-menu) no bloquea el primer paint: se
// hidrata en un chunk asíncrono. El fallback pinta el mismo botón fantasma
// para que no haya salto visual.
const AccountMenu = lazy(() =>
  import("@/components/AccountMenu").then((m) => ({ default: m.AccountMenu })),
);

const AccountMenuFallback = () => (
  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Cuenta" disabled>
    <User className="w-5 h-5" />
  </Button>
);

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
  const { user } = useAuth();
  const { rate } = useExchangeRate();
  const location = useLocation();
  const navigate = useNavigate();
  const [bump, setBump] = useState(false);
  const [prevCount, setPrevCount] = useState(itemCount);
  const [welcome, setWelcome] = useState<WelcomeData | null>(null);

  // El icono de la tienda es la puerta de la cuenta: si el cliente no ha
  // entrado, lo lleva al login con animación de bienvenida; si ya entró,
  // lo lleva a su panel. (El enlace "Inicio" del menú sigue yendo al home.)
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (welcome) return;
    const to = user ? "/cuenta" : "/auth";
    if (location.pathname === to) return;
    setWelcome({
      to,
      title: user ? "¡Hola de nuevo!" : "¡Bienvenido a NeoCharge!",
      subtitle: user ? "Abriendo tu panel..." : "Entra o crea tu cuenta en segundos",
    });
  };

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
              ? "glass-water shadow-xl shadow-brand-500/15 h-16"
              : "glass-water h-20",
          )}
        >
          <Logo onClick={handleLogoClick} />

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
            {/* Account (chunk asíncrono: no bloquea el primer paint) */}
            <Suspense fallback={<AccountMenuFallback />}>
              <AccountMenu />
            </Suspense>

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
                    "absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-br from-brand-500 to-grape-600 text-white text-[10px] font-bold flex items-center justify-center shadow-glow-brand-sm",
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
            {/* Tasa del día (visible en móvil; en escritorio va en la barra superior) */}
            <p className="mt-3 px-4 text-xs text-muted-foreground">
              Tasa hoy: {rate ? `${Math.round(rate.usd_to_cup)} CUP/USD · elTOQUE` : "—"}
            </p>
          </div>
        )}
      </div>

      {/* Animación de bienvenida al tocar el icono de la tienda */}
      <WelcomeTransition
        data={welcome}
        onNavigate={(to) => navigate(to)}
        onDone={() => setWelcome(null)}
      />
    </header>
  );
}


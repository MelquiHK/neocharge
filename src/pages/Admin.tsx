import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  MapPin,
  ShoppingBag,
  Users,
  TrendingUp,
  BookOpen,
  Settings,
  Menu,
  X,
  ArrowLeft,
  LogOut,
  UserCircle,
  Wrench,
  Truck,
  ShieldAlert,
  Store,
  ChevronRight,
  Wallet,
  BarChart3,
  Handshake,
  Bell,
  CheckCheck,
  Share2,
  Zap,
  LayoutGrid,
} from "lucide-react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminLocations } from "@/components/admin/AdminLocations";
import { AdminSocios } from "@/components/admin/AdminSocios";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminCustomers } from "@/components/admin/AdminCustomers";
import { AdminRates } from "@/components/admin/AdminRates";
import { AdminBlog } from "@/components/admin/AdminBlog";
import { AdminSales } from "@/components/admin/AdminSales";
import { AdminReferrals } from "@/components/admin/AdminReferrals";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminCashbox } from "@/components/admin/AdminCashbox";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminMessenger } from "@/components/admin/AdminMessenger";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { useOrderNotifications } from "@/hooks/admin/use-order-notifications";
import { cn } from "@/lib/utils";
import { useSEO } from "@/hooks/use-seo";

const Admin = () => {
  useSEO("admin");  const { user, isAdmin, permissions, loading, authDataReady, authDataFailed, retryAuthData, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // Permite enlaces directos a pestañas: /admin#tab=rates
    const m = window.location.hash.match(/tab=([a-z]+)/);
    return m ? m[1] : "dashboard";
  });

  // Si ya estás en /admin y haces clic en un enlace con otro #tab=...
  // (p. ej. "Falta tasa USD hoy" → /admin#tab=rates), el hash cambia sin
  // recargar: este listener conmuta la pestaña en vivo.
  useEffect(() => {
    const onHashChange = () => {
      const m = window.location.hash.match(/tab=([a-z]+)/);
      if (m) setActiveTab(m[1]);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead } = useOrderNotifications(true);

  // (El título y los meta tags los gestiona useSEO("admin").)

  // El panel se comporta como una app: sin pellizco para ampliar.
  // Al salir del panel se restaura el viewport original (la tienda conserva el zoom).
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    );
    return () => {
      if (meta) meta.setAttribute("content", original);
    };
  }, []);

  /* ── Derivaciones de navegación y hooks de pestañas visitadas ────────
     IMPORTANTE (regresión 2026-11-15 · error de React #310): TODOS los
     hooks del componente van ANTES de los retornos tempranos de abajo.
     Antes, `visitedTabs` vivía tras los `if (loading) return…`: en el
     montaje en frío (entrada directa o recarga en /admin) el primer
     render salía por el retorno de carga sin ejecutar esos hooks, y al
     resolverse la sesión el render siguiente ejecutaba MÁS hooks que el
     anterior → «Rendered more hooks than during the previous render» y
     la app caía en «Algo salió mal». Por navegación interna la sesión ya
     venía resuelta al montar y nunca se notó. No mover hooks bajo los
     retornos tempranos. */
  const isOwner = permissions.is_owner;
  const groups: { label: string; items: { v: string; l: string; icon: typeof LayoutDashboard; show: boolean; badge?: number }[] }[] = [
    {
      label: "Panel",
      items: [{ v: "dashboard", l: "Resumen", icon: LayoutDashboard, show: true }],
    },
    {
      label: "Ventas",
      items: [
        { v: "orders", l: "Pedidos", icon: ShoppingBag, show: isOwner || permissions.can_manage_orders, badge: unreadCount > 0 ? unreadCount : undefined },
        { v: "sales", l: "Ventas", icon: TrendingUp, show: isOwner || permissions.can_manage_orders || permissions.can_view_finances },
        { v: "analytics", l: "Analytics", icon: BarChart3, show: isOwner || permissions.can_view_finances || permissions.can_manage_orders },
        { v: "cashbox", l: "Caja", icon: Wallet, show: isOwner || permissions.can_view_finances },
        { v: "customers", l: "Clientes", icon: Users, show: isOwner || permissions.can_manage_customers },
        { v: "referrals", l: "Referidos", icon: Share2, show: isOwner || permissions.can_manage_orders || permissions.can_view_finances },
      ],
    },
    {
      label: "Catálogo",
      items: [
        { v: "products", l: "Productos", icon: Package, show: isOwner || permissions.can_manage_products },
        { v: "categories", l: "Categorías", icon: FolderTree, show: isOwner || permissions.can_manage_products },
        { v: "services", l: "Servicios", icon: Wrench, show: isOwner || permissions.can_manage_products },
        { v: "blog", l: "Blog", icon: BookOpen, show: isOwner || permissions.can_manage_blog },
      ],
    },
    {
      label: "Operaciones",
      items: [
        { v: "rates", l: "Tasa USD", icon: TrendingUp, show: isOwner || permissions.can_manage_rates },
        { v: "locations", l: "Locales", icon: MapPin, show: isOwner || permissions.can_manage_locations },
        { v: "socios", l: "Socios", icon: Handshake, show: isOwner || permissions.can_manage_locations },
        { v: "messenger", l: "Mensajería", icon: Truck, show: isOwner || permissions.can_manage_locations },
      ],
    },
    {
      label: "Sistema",
      items: [
        { v: "settings", l: "Configuración", icon: Settings, show: isOwner || !!Object.values(permissions).some(Boolean) },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((t) => t.show) }))
    .filter((g) => g.items.length > 0);

  const allTabs = groups.flatMap((g) => g.items);
  const activeTabInfo = allTabs.find((t) => t.v === activeTab) || allTabs[0];
  const ActiveIcon = activeTabInfo.icon;

  // Pestaña efectiva: si el hash trae una sin permiso o inexistente, se
  // cae a la primera disponible (mismo comportamiento que el switch de
  // antes, que terminaba en el Resumen).
  const effectiveTab = allTabs.some((t) => t.v === activeTab)
    ? activeTab
    : allTabs[0]?.v ?? "dashboard";

  // Pestañas que se quedan MONTADAS tras visitarlas: volver a ellas es
  // instantáneo, con filtros, búsqueda y scroll intactos (y sus hooks
  // sirven la caché en memoria). Resumen y Mensajería quedan fuera: el
  // Resumen se recarga fresco en cada visita y Mensajería usa mapas en
  // vivo que no deben vivir ocultos.
  const KEEP_ALIVE_TABS = new Set([
    "orders", "products", "categories", "services", "locations", "socios",
    "customers", "rates", "settings", "blog", "sales", "referrals",
    "analytics", "cashbox",
  ]);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([effectiveTab]));
  useEffect(() => {
    setVisitedTabs((prev) =>
      prev.has(effectiveTab) ? prev : new Set(prev).add(effectiveTab)
    );
  }, [effectiveTab]);

  if (loading || !authDataReady)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-gradient-primary text-white shadow-glow">
            <Zap className="h-8 w-8" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/15 border-t-primary" />
          <p className="text-sm text-slate-400">Abriendo tu panel…</p>
        </div>
      </div>
    );

  if (!user) return <Navigate to="/auth" replace />;

  // La sesión SÍ existe, pero los roles/permisos no pudieron cargarse
  // (red caída al abrir el panel): esto NO es «acceso restringido».
  // Antes este caso caía en la pantalla de restringido y Mel quedaba
  // «botado» sin camino de vuelta; ahora se ofrece reintentar la carga
  // sin cerrar la sesión.
  if (!isAdmin && authDataFailed)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900 p-8 text-center shadow-dramatic">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-white">No se pudo cargar tu sesión</h1>
            <p className="text-sm text-slate-400">
              Tu cuenta sigue iniciada, pero la conexión falló al verificar tus permisos. Revisa la conexión y toca Reintentar.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={retryAuthData}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-primary px-6 text-sm font-semibold text-white shadow-glow transition-opacity hover:opacity-90"
            >
              Reintentar
            </button>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white hover:underline"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900 p-8 text-center shadow-dramatic">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-white">Acceso restringido</h1>
            <p className="text-sm text-slate-400">
              Necesitas privilegios de administrador para ingresar a esta sección.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al sitio principal
          </Link>
        </div>
      </div>
    );

  const renderContent = (tab: string) => {
    switch (tab) {
      case "dashboard": return <AdminDashboard />;
      case "orders": return <AdminOrders />;
      case "products": return <AdminProducts />;
      case "categories": return <AdminCategories />;
      case "services": return <AdminServices />;
      case "locations": return <AdminLocations />;
      case "socios": return <AdminSocios />;
      case "messenger": return <AdminMessenger />;
      case "customers": return <AdminCustomers />;
      case "rates": return <AdminRates />;
      case "settings": return <AdminSettings />;
      case "blog": return <AdminBlog />;
      case "sales": return <AdminSales />;
      case "referrals": return <AdminReferrals />;
      case "analytics": return <AdminAnalytics />;
      case "cashbox": return <AdminCashbox />;
      default: return <AdminDashboard />;
    }
  };

  const goTo = (v: string) => {
    setActiveTab(v);
    setSidebarOpen(false);
    try {
      window.history.replaceState(null, "", `#tab=${v}`);
    } catch {
      // sin historial disponible: no es crítico
    }
  };

  // Acceso rápido móvil (una mano): las 4 secciones de uso diario que el
  // usuario tenga permitidas + botón «Más» que abre el menú completo.
  const quickOrder = ["dashboard", "orders", "products", "sales"];
  const quickTabs = [
    ...quickOrder
      .map((v) => allTabs.find((t) => t.v === v))
      .filter((t): t is (typeof allTabs)[number] => !!t),
    ...allTabs.filter((t) => !quickOrder.includes(t.v)),
  ].slice(0, 4);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      {/* Marca: logo oficial de NeoCharge (el mismo /icon.svg de la tienda) */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/icon.svg"
            alt="NeoCharge"
            className="h-10 w-10 shrink-0 rounded-[10px] shadow-glow"
          />
          <div>
            <p className="font-display text-base font-bold leading-none text-white">NeoCharge</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
              Panel admin
            </p>
          </div>
        </Link>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Usuario */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <UserCircle className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.email?.split("@")[0]}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {isOwner ? "Propietario" : "Administrador"}
          </p>
        </div>
      </div>

      {/* Navegación agrupada */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {g.label}
            </p>
            <div className="space-y-1">
              {g.items.map((t) => {
                const Icon = t.icon;
                const isActive = effectiveTab === t.v;
                return (
                  <button
                    key={t.v}
                    onClick={() => goTo(t.v)}
                    className={cn(
                      "group relative flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 lg:min-h-0",
                      isActive
                        ? "bg-gradient-primary font-semibold text-white shadow-glow"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white/90 transition-opacity",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                          isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                        )}
                      />
                      {t.l}
                    </span>
                    {t.badge ? (
                      <span
                        className={cn(
                          "animate-pulse rounded-full px-2 py-0.5 text-[10px] font-bold",
                          isActive ? "bg-white text-primary" : "bg-red-500 text-white"
                        )}
                      >
                        {t.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Acciones de pie (con margen del área segura inferior del teléfono) */}
      <div className="space-y-1 border-t border-white/10 bg-white/[0.02] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 transition-all hover:bg-white/5 hover:text-white lg:min-h-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a la Tienda
        </Link>
        <button
          onClick={signOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300 lg:min-h-0"
        >
          <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* Sidebar escritorio */}
      <aside className="hidden h-full w-72 shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {/* Drawer móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="h-full w-[85vw] max-w-72 animate-slide-in-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Columna principal */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 transition-colors hover:bg-muted lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Ubicación">
              <span className="hidden text-muted-foreground sm:inline">Panel</span>
              <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/60 sm:inline" />
              <span className="flex items-center gap-2 font-semibold">
                <ActiveIcon className="h-4 w-4 text-primary" />
                <span className="truncate">{activeTabInfo.l}</span>
              </span>
            </nav>
          </div>

          <div className="relative flex shrink-0 items-center gap-2 sm:gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => { markAllAsRead(); goTo("orders"); }}
                className="flex min-h-11 items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 lg:min-h-0"
                title="Ver pedidos y marcar como vistos"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {unreadCount} nuevo{unreadCount === 1 ? "" : "s"}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-muted lg:h-9 lg:w-9"
                aria-label="Notificaciones"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
                    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                      <p className="text-sm font-bold">Notificaciones</p>
                      <button
                        onClick={() => { markAllAsRead(); setNotifOpen(false); }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Marcar vistas
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                          Sin notificaciones por ahora.
                        </p>
                      ) : (
                        notifications.slice(0, 30).map((n) => (
                          <button
                            key={n.id}
                            onClick={() => { setNotifOpen(false); goTo(n.type === "order" ? "orders" : "sales"); }}
                            className="flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60"
                          >
                            <span className="mt-0.5 text-lg leading-none">
                              {n.type === "order" ? "🎉" : "📈"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{n.subtitle}</span>
                              <span className="block text-xs text-muted-foreground">
                                {new Date(n.created_at).toLocaleString("es-CU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted sm:px-4 lg:min-h-0"
            >
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver tienda</span>
            </Link>
          </div>
        </header>

        {/* Contenido desplazable: cada pestaña visitada queda montada y
            solo se oculta (hidden), así volver a ella no recarga nada. */}
        <main className="flex-1 overflow-y-auto">
          {allTabs
            .filter((t) => visitedTabs.has(t.v))
            .map((t) => {
              const isActive = t.v === effectiveTab;
              if (!isActive && !KEEP_ALIVE_TABS.has(t.v)) return null;
              return (
                <div
                  key={t.v}
                  hidden={!isActive}
                  className="mx-auto max-w-[1440px] animate-fade-in space-y-6 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8"
                >
                  {renderContent(t.v)}
                </div>
              );
            })}
        </main>
      </div>

      {/* Acceso rápido móvil: pulgar, sin abrir el menú lateral */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Acceso rápido"
      >
        <div className="grid grid-cols-5">
          {quickTabs.map((t) => {
            const Icon = t.icon;
            const isActive = effectiveTab === t.v;
            return (
              <button
                key={t.v}
                onClick={() => goTo(t.v)}
                className={cn(
                  "relative flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors",
                  isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <span
                  className={cn(
                    "absolute inset-x-8 top-0 h-0.5 rounded-full bg-gradient-primary transition-opacity",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="relative">
                  <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  {t.badge ? (
                    <span className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {t.badge > 99 ? "99+" : t.badge}
                    </span>
                  ) : null}
                </span>
                {t.l}
              </button>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-300"
          >
            <LayoutGrid className="h-5 w-5" />
            Más
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Admin;

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
} from "lucide-react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminLocations } from "@/components/admin/AdminLocations";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminCustomers } from "@/components/admin/AdminCustomers";
import { AdminRates } from "@/components/admin/AdminRates";
import { AdminBlog } from "@/components/admin/AdminBlog";
import { AdminSales } from "@/components/admin/AdminSales";
import { AdminCashbox } from "@/components/admin/AdminCashbox";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminMessenger } from "@/components/admin/AdminMessenger";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { useOrderNotifications } from "@/hooks/admin/use-order-notifications";
import { cn } from "@/lib/utils";

const Admin = () => {
  const { user, isAdmin, permissions, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unreadCount } = useOrderNotifications(true);

  useEffect(() => {
    document.title = "Admin — NeoCharge";
  }, []);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-gradient-primary font-display text-3xl font-bold text-white shadow-glow">
            N
          </div>
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/15 border-t-primary" />
          <p className="text-sm text-slate-400">Abriendo tu panel…</p>
        </div>
      </div>
    );

  if (!user) return <Navigate to="/auth" replace />;

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
        { v: "cashbox", l: "Caja", icon: Wallet, show: isOwner || permissions.can_view_finances },
        { v: "customers", l: "Clientes", icon: Users, show: isOwner || permissions.can_manage_customers },
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

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <AdminDashboard />;
      case "orders": return <AdminOrders />;
      case "products": return <AdminProducts />;
      case "categories": return <AdminCategories />;
      case "services": return <AdminServices />;
      case "locations": return <AdminLocations />;
      case "messenger": return <AdminMessenger />;
      case "customers": return <AdminCustomers />;
      case "rates": return <AdminRates />;
      case "settings": return <AdminSettings />;
      case "blog": return <AdminBlog />;
      case "sales": return <AdminSales />;
      case "cashbox": return <AdminCashbox />;
      default: return <AdminDashboard />;
    }
  };

  const goTo = (v: string) => {
    setActiveTab(v);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      {/* Marca */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary font-display text-xl font-bold text-white shadow-glow">
            N
          </div>
          <div>
            <p className="font-display text-base font-bold leading-none text-white">NeoCharge</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
              Panel admin
            </p>
          </div>
        </Link>
        <button
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
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
                const isActive = activeTab === t.v;
                return (
                  <button
                    key={t.v}
                    onClick={() => goTo(t.v)}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary font-semibold text-white shadow-lg shadow-primary/25"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
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

      {/* Acciones de pie */}
      <div className="space-y-1 border-t border-white/10 bg-white/[0.02] p-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 transition-all hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a la Tienda
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
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
            className="h-full w-72 animate-slide-in-left shadow-2xl"
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
              className="rounded-xl border border-border/70 p-2 transition-colors hover:bg-muted lg:hidden"
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

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => goTo("orders")}
                className="flex animate-pulse items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {unreadCount} nuevo{unreadCount === 1 ? "" : "s"}
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted sm:px-4"
            >
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver tienda</span>
            </Link>
          </div>
        </header>

        {/* Contenido desplazable */}
        <main className="flex-1 overflow-y-auto">
          <div
            key={activeTab}
            className="mx-auto max-w-[1440px] animate-fade-in space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;

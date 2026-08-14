import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  UserCircle 
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
import { AdminServices } from "@/components/admin/AdminServices";
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground animate-pulse">Iniciando panel de control...</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdmin) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-inner text-2xl font-bold">⚠️</div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Acceso restringido</h1>
          <p className="text-muted-foreground">Necesitas privilegios de administrador para ingresar a esta sección.</p>
        </div>
        <div className="pt-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver al sitio principal
          </Link>
        </div>
      </div>
    </div>
  );

  const isOwner = permissions.is_owner;
  const tabs = [
    { v: "dashboard", l: "Resumen", icon: LayoutDashboard, show: true },
    { v: "orders", l: "Pedidos", icon: ShoppingBag, show: isOwner || permissions.can_manage_orders, badge: unreadCount > 0 ? unreadCount : undefined },
    { v: "products", l: "Productos", icon: Package, show: isOwner || permissions.can_manage_products },
    { v: "categories", l: "Categorías", icon: FolderTree, show: isOwner || permissions.can_manage_products },
    { v: "services", l: "Servicios", icon: Package, show: isOwner || permissions.can_manage_products },
    { v: "locations", l: "Locales", icon: MapPin, show: isOwner || permissions.can_manage_locations },
    { v: "customers", l: "Clientes", icon: Users, show: isOwner || permissions.can_manage_customers },
    { v: "rates", l: "Tasa USD", icon: TrendingUp, show: isOwner || permissions.can_manage_rates },
    { v: "sales", l: "Ventas", icon: TrendingUp, show: isOwner || permissions.can_manage_orders || permissions.can_view_finances },
    { v: "blog", l: "Blog", icon: BookOpen, show: isOwner || permissions.can_manage_blog },
    { v: "settings", l: "Configuración", icon: Settings, show: isOwner || !!Object.values(permissions).some(Boolean) },
  ].filter((t) => t.show);

  const activeTabInfo = tabs.find(t => t.v === activeTab) || tabs[0];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <AdminDashboard />;
      case "orders": return <AdminOrders />;
      case "products": return <AdminProducts />;
      case "categories": return <AdminCategories />;
      case "services": return <AdminServices />;
      case "locations": return <AdminLocations />;
      case "customers": return <AdminCustomers />;
      case "rates": return <AdminRates />;
      case "settings": return <AdminSettings />;
      case "blog": return <AdminBlog />;
      case "sales": return <AdminSales />;
      default: return <AdminDashboard />;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 dark:bg-slate-950 border-r border-slate-800">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-display font-bold tracking-tight text-white">NeoCharge</span>
          <span className="text-[9px] font-bold uppercase tracking-widest bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20">Admin</span>
        </Link>
        <button className="lg:hidden p-1 rounded-lg hover:bg-slate-800" onClick={() => setSidebarOpen(false)}>
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* User Profile Summary */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <UserCircle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-white">{user.email?.split("@")[0]}</p>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {isOwner ? "Propietario (Owner)" : "Administrador"}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.v;
          return (
            <button
              key={t.v}
              onClick={() => {
                setActiveTab(t.v);
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-semibold" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
                {t.l}
              </span>
              {t.badge && (
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse",
                  isActive ? "bg-white text-primary" : "bg-red-500 text-white"
                )}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-1">
        <Link 
          to="/" 
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/30 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a la Tienda
        </Link>
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
        </button>
      </div>
    </div>
  );



  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar (Left Column) */}
      <aside className="hidden lg:block w-64 h-full shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSidebarOpen(false)}>
          <div className="w-64 h-full shadow-2xl animate-slide-in-left" onClick={(e) => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area (Right Column) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar for mobile header and global context */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Abrir Menú"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>Admin</span>
              <span>/</span>
              <span className="font-medium text-foreground capitalize">{activeTabInfo.l}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/40 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {unreadCount} Pedidos Nuevos
              </span>
            )}
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Ver Tienda
            </Link>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
          <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
            {/* Header section of active Tab */}
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-bold tracking-tight">{activeTabInfo.l}</h1>
              <p className="text-sm text-muted-foreground">
                {activeTab === "dashboard" && "Resumen en tiempo real del estado de ventas, pedidos y operaciones."}
                {activeTab === "orders" && "Gestión, confirmación e historial de pedidos y despachos."}
                {activeTab === "products" && "Añade, edita y organiza tu inventario de productos premium."}
                {activeTab === "categories" && "Clasifica y jerarquiza tus productos en el catálogo de la tienda."}
                {activeTab === "services" && "Administración de servicios técnicos oficiales de reparación e instalación."}
                {activeTab === "locations" && "Gestión de puntos de venta físicos, almacenes y horarios de atención."}
                {activeTab === "customers" && "Base de datos, perfiles e historial de compras de tus clientes."}
                {activeTab === "rates" && "Actualización de tasas oficiales de cambio USD / CUP."}
                {activeTab === "sales" && "Registro de transacciones de ventas y métricas financieras."}
                {activeTab === "blog" && "Redacción, edición y publicación de artículos y novedades."}
                {activeTab === "settings" && "Configuración avanzada del sistema, permisos de usuarios e integraciones."}
              </p>
            </div>

            {/* Core active section body */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md shadow-slate-100 dark:shadow-none min-h-[400px]">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;

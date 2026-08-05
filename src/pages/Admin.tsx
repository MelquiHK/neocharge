import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Package, FolderTree, MapPin, ShoppingBag, Users, TrendingUp, BookOpen, Settings } from "lucide-react";
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
import { OrderNotificationsWidget } from "@/components/admin/OrderNotificationsWidget";

const Admin = () => {
  const { user, isAdmin, permissions, loading } = useAuth();

  useEffect(() => { document.title = "Admin — NeoCharge"; }, []);

  if (loading) return <div className="container-page py-20 text-center">Cargando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return (
    <div className="container-page py-20 text-center space-y-3">
      <h1 className="font-display text-3xl font-bold">Acceso restringido</h1>
      <p className="text-muted-foreground">Necesitas ser administrador para entrar al panel.</p>
    </div>
  );

  const isOwner = permissions.is_owner;
  const tabs = [
    { v: "dashboard", l: "Resumen", icon: LayoutDashboard, show: true },
    { v: "orders", l: "Pedidos", icon: ShoppingBag, show: isOwner || permissions.can_manage_orders },
    { v: "products", l: "Productos", icon: Package, show: isOwner || permissions.can_manage_products },
    { v: "categories", l: "Categorías", icon: FolderTree, show: isOwner || permissions.can_manage_products },
    { v: "services", l: "Servicios", icon: Package, show: isOwner || permissions.can_manage_products },
    { v: "locations", l: "Locales", icon: MapPin, show: isOwner || permissions.can_manage_locations },
    { v: "customers", l: "Clientes", icon: Users, show: isOwner || permissions.can_manage_customers },
    { v: "rates", l: "Tasa USD", icon: TrendingUp, show: isOwner || permissions.can_manage_rates },
    { v: "settings", l: "Configuración", icon: Settings, show: isOwner || !!Object.values(permissions).some(Boolean) },
    { v: "sales", l: "Ventas", icon: TrendingUp, show: isOwner || permissions.can_manage_orders || permissions.can_view_finances },
    { v: "blog", l: "Blog", icon: BookOpen, show: isOwner || permissions.can_manage_blog },
  ].filter((t) => t.show);

  return (
    <div className="container-page py-12 space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <OrderNotificationsWidget inline />
      </div>
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Panel de administración</h1>
        <p className="text-muted-foreground max-w-3xl">
          Controla los pedidos en tiempo real, administra productos y clientes, y observa los datos más importantes desde un panel moderno y adaptable.
        </p>
        <p className="text-sm text-muted-foreground">
          Usa las pestañas para acceder rápido a cada sección. En dispositivos móviles las opciones se adaptan y se muestran con botones claros.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-2xl justify-start">
          {tabs.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="gap-2 rounded-xl">
              <t.icon className="w-4 h-4" /> {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6"><AdminDashboard /></TabsContent>
        <TabsContent value="orders" className="mt-6"><AdminOrders /></TabsContent>
        <TabsContent value="products" className="mt-6"><AdminProducts /></TabsContent>
        <TabsContent value="categories" className="mt-6"><AdminCategories /></TabsContent>
        <TabsContent value="services" className="mt-6"><AdminServices /></TabsContent>
        <TabsContent value="locations" className="mt-6"><AdminLocations /></TabsContent>
        <TabsContent value="customers" className="mt-6"><AdminCustomers /></TabsContent>
        <TabsContent value="rates" className="mt-6"><AdminRates /></TabsContent>
        <TabsContent value="settings" className="mt-6"><AdminSettings /></TabsContent>
        <TabsContent value="blog" className="mt-6"><AdminBlog /></TabsContent>
        <TabsContent value="sales" className="mt-6"><AdminSales /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;

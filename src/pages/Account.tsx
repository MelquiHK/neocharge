import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { Package, LogOut, LayoutDashboard } from "lucide-react";

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  items: any;
}

const Account = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    document.title = "Mi cuenta — NeoCharge";
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id,created_at,total,status,items")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setOrders(data as Order[]));
  }, [user]);

  if (loading) {
    return (
      <div className="container-page py-20 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        <div className="space-y-3 mt-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="container-page py-12 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
            Perfil de Cliente
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight">Mi cuenta</h1>
          <p className="text-lg text-muted-foreground font-light">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/admin"><LayoutDashboard className="w-4 h-4" /> Panel admin</Link>
            </Button>
          )}
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        </div>
      </header>

      <section className="card-elevated p-6">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> Mis pedidos
        </h2>
        {orders.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted-foreground">No tienes pedidos todavía.</p>
            <Button asChild variant="hero"><Link to="/tienda">Empezar a comprar</Link></Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => (
              <div key={o.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">Pedido #{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("es-CU")} · {Array.isArray(o.items) ? o.items.length : 0} productos
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-primary">{formatPrice(o.total)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Account;

import { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, formatCUP } from "@/lib/format";
import { Package, LogOut, LayoutDashboard, User, Phone, Info, Save, MessageSquare, Wallet, CheckCircle, Clock, Map, Calculator, Send } from "lucide-react";
import { toast } from "sonner";
import { computeSalesTotalsBySeller } from "@/lib/sales";

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  items: any;
}

const Account = () => {
  const { user, profile, role, isGestor, isMensajero, isAdmin, signOut, loading, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    phone: "",
    bio: "",
    avatar_url: ""
  });
  const [saving, setSaving] = useState(false);
  
  // Gestor specific data
  const [gestorSales, setGestorSales] = useState<any[]>([]);
  const [requestingPayment, setRequestingPayment] = useState(false);

  useEffect(() => {
    document.title = "Mi cuenta — NeoCharge";
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        phone: profile.phone || "",
        bio: (profile as any).bio || "",
        avatar_url: profile.avatar_url || ""
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    
    // Load orders
    supabase
      .from("orders")
      .select("id,created_at,total,status,items")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setOrders(data as Order[]));

    // Load sales if gestor
    if (isGestor) {
      supabase
        .from("seller_sales")
        .select("*")
        .eq("seller_user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => data && setGestorSales(data));
    }
  }, [user, isGestor]);

  const gestorStats = useMemo(() => {
    if (!isGestor) return null;
    return computeSalesTotalsBySeller(gestorSales);
  }, [isGestor, gestorSales]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username,
          phone: formData.phone,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      setEditing(false);
      toast.success("Perfil actualizado correctamente");
    } catch (error: any) {
      toast.error("Error al actualizar perfil: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPayment = async () => {
    if (!user || !gestorStats) return;
    const pending = gestorStats.bySeller[0]?.pendingCommission || 0;
    if (pending <= 0) {
      toast.error("No tienes comisiones pendientes de pago.");
      return;
    }

    setRequestingPayment(true);
    try {
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        amount: pending,
        currency: "CUP",
        notes: `Solicitud de pago de comisiones acumuladas.`
      });

      if (error) throw error;
      toast.success("Solicitud de pago enviada al administrador.");
    } catch (error: any) {
      toast.error("Error al solicitar pago: " + error.message);
    } finally {
      setRequestingPayment(false);
    }
  };

  const sendToWhatsApp = () => {
    if (!gestorStats) return;
    const stats = gestorStats.bySeller[0];
    const message = `Hola, soy ${profile?.full_name || profile?.username}. Mi resumen de ventas:\n\n` +
      `Total Ventas: ${stats.count}\n` +
      `Total Comisión: ${formatCUP(stats.totalCommission)}\n` +
      `Pagado: ${formatCUP(stats.paidCommission)}\n` +
      `Pendiente: ${formatCUP(stats.pendingCommission)}\n\n` +
      `Por favor, revisa mis pagos. ¡Gracias!`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/5363180910?text=${encoded}`, "_blank");
  };

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
            {role === "owner" ? "Dueño Supremo" : role === "admin" ? "Administrador" : role === "gestor" ? "Gestor de Ventas" : role === "mensajero" ? "Mensajero" : "Perfil de Cliente"}
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight">Mi cuenta</h1>
          <p className="text-lg text-muted-foreground font-light">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/admin"><LayoutDashboard className="w-4 h-4" /> Panel admin</Link>
            </Button>
          )}
          {isMensajero && (
            <Button asChild variant="hero">
              <Link to="/mensajeria"><Map className="w-4 h-4" /> Panel Mensajero</Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Cancelar" : "Editar perfil"}
          </Button>
          <Button variant="outline" onClick={signOut} className="text-destructive border-destructive/20 hover:bg-destructive/10">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <section className="card-elevated p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">{profile?.full_name || profile?.username}</h3>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-primary" />
                <span>{profile?.phone || "Sin teléfono"}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Info className="w-4 h-4 text-primary mt-1" />
                <p className="text-muted-foreground italic">{(profile as any)?.bio || "Sin biografía"}</p>
              </div>
            </div>
          </section>

          {editing && (
            <section className="card-elevated p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
              <h3 className="font-bold flex items-center gap-2"><Save className="w-4 h-4" /> Editar Datos</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nombre Completo</Label>
                  <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Nombre de Usuario</Label>
                  <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Teléfono</Label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Foto de Perfil (URL)</Label>
                  <Input value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Biografía</Label>
                  <Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full mt-4">
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isGestor && gestorStats && (
            <section className="card-elevated p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  <Wallet className="w-6 h-6 text-primary" /> Resumen de Gestor
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={sendToWhatsApp} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                    <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp Admin
                  </Button>
                  <Button size="sm" onClick={handleRequestPayment} disabled={requestingPayment}>
                    <Send className="w-4 h-4 mr-2" /> Pedir Pago
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-border">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" /> Pendiente
                  </div>
                  <div className="text-2xl font-bold text-amber-600">{formatCUP(gestorStats.bySeller[0]?.pendingCommission || 0)}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-border">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground mb-1">
                    <CheckCircle className="w-3 h-3" /> Pagado
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">{formatCUP(gestorStats.bySeller[0]?.paidCommission || 0)}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-border">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground mb-1">
                    <Package className="w-3 h-3" /> Ventas
                  </div>
                  <div className="text-2xl font-bold text-primary">{gestorStats.bySeller[0]?.count || 0}</div>
                </div>
              </div>
            </section>
          )}

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
      </div>
    </div>
  );
};

export default Account;

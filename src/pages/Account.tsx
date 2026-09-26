import { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, formatCUP } from "@/lib/format";
import { Package, LogOut, LayoutDashboard, User, Phone, Info, Save, MessageSquare, Wallet, CheckCircle, Clock, Map, Calculator, Send } from "lucide-react";
import { toast } from "sonner";
import "@/components/sections/visual-effects.css";
import { computeSalesTotalsBySeller, type SellerSale } from "@/lib/sales";

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  items: unknown;
}

interface ProfileWithBio {
  bio?: string | null;
  [key: string]: unknown;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Gestor specific data
  const [gestorSales, setGestorSales] = useState<SellerSale[]>([]);
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
        bio: (profile as ProfileWithBio | null)?.bio || "",
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

const handleAvatarUpload = async (file: File) => {
    if (!user) return null;
    setUploading(true);
    try {
      await supabase.auth.getSession(); // Refrescar sesión
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`; // Nombre más único
      const filePath = `avatars/${user.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: unknown) {
      toast.error('Error al subir la imagen: ' + (error instanceof Error ? error.message : String(error)));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    let newAvatarUrl = formData.avatar_url;

    try {
      if (selectedFile) {
        const uploadedUrl = await handleAvatarUpload(selectedFile);
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
          setSelectedFile(null); // Clear selected file after successful upload
        } else {
          // If upload failed, stop saving profile and show error
          toast.error("No se pudo subir la imagen. Intenta de nuevo.");
          setSaving(false); // Ensure saving is false if upload fails
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username,
          phone: formData.phone,
          bio: formData.bio,
          avatar_url: newAvatarUrl, // Use the new URL (or existing if no upload)
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      setEditing(false);
      toast.success("Perfil actualizado correctamente");
    } catch (error: unknown) {
      toast.error("Error al actualizar perfil: " + (error instanceof Error ? error.message : String(error)));
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
    } catch (error: unknown) {
      toast.error("Error al solicitar pago: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setRequestingPayment(false);
    }
  };

  const sendToWhatsApp = () => {
    if (!gestorStats) return;
    const stats = gestorStats.bySeller[0];
    const message = `Hola, soy ${profile?.full_name || profile?.username}. Mi resumen de ventas:

Total Ventas: ${stats.count}
Total Comisión: ${formatCUP(stats.totalCommission)}
Pagado: ${formatCUP(stats.paidCommission)}
Pendiente: ${formatCUP(stats.pendingCommission)}

Por favor, revisa mis pagos. ¡Gracias!`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/5363180910?text=${encoded}`, "_blank");
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden bg-[#070d20]">
        <div className="nc-wash-a" aria-hidden />
        <div className="nc-wash-b" aria-hidden />
        <div className="relative container-page py-20 space-y-4">
          <div className="h-8 bg-white/10 rounded animate-pulse w-1/3" />
          <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
          <div className="space-y-3 mt-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/10 rounded-3xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="relative overflow-hidden bg-[#070d20]">
      {/* Lavados de color + orbes */}
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-52 -left-32 w-[480px] h-[480px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"
        aria-hidden
      />

      <div className="relative container-page py-12 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-white/10 pb-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-cyan-200 text-xs font-bold uppercase tracking-widest backdrop-blur-xl">
              {role === "owner" ? "Dueño Supremo" : role === "admin" ? "Administrador" : role === "gestor" ? "Gestor de Ventas" : role === "mensajero" ? "Mensajero" : "Perfil de Cliente"}
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight text-white">Mi cuenta</h1>
            <p className="text-lg text-slate-300 font-light">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button asChild className="rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-xl">
                <Link to="/admin"><LayoutDashboard className="w-4 h-4" /> Panel admin</Link>
              </Button>
            )}
            {isMensajero && (
              <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-blue-50 font-bold">
                <Link to="/mensajeria"><Map className="w-4 h-4" /> Panel Mensajero</Link>
              </Button>
            )}
            <Button onClick={() => setEditing(!editing)} className="rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-xl">
              {editing ? "Cancelar" : "Editar perfil"}
            </Button>
            <Button onClick={signOut} className="rounded-full bg-red-500/15 border border-red-400/30 text-red-200 hover:bg-red-500/25 backdrop-blur-xl">
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </Button>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <section className="rounded-[2rem] border border-white/25 nc-liquid nc-sheen p-6 space-y-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-4 border-white/20 shadow-lg">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">{profile?.full_name || profile?.username}</h3>
                  <p className="text-sm text-slate-400">@{profile?.username}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <Phone className="w-4 h-4 text-cyan-300" />
                  <span>{profile?.phone || "Sin teléfono"}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Info className="w-4 h-4 text-cyan-300 mt-1" />
                  <p className="text-slate-400 italic">{(profile as ProfileWithBio | null)?.bio || "Sin biografía"}</p>
                </div>
              </div>
            </section>

            {editing && (
              <section className="rounded-[2rem] border border-white/25 nc-liquid nc-sheen p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold flex items-center gap-2 text-white"><Save className="w-4 h-4" /> Editar Datos</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-slate-200 font-medium">Nombre Completo</Label>
                    <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-200 font-medium">Nombre de Usuario</Label>
                    <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-200 font-medium">Teléfono</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-200 font-medium">Foto de Perfil</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                        {selectedFile ? (
                          <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                        ) : formData.avatar_url ? (
                          <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                        className="flex-grow h-12 rounded-2xl bg-white/10 border-white/20 text-slate-200 file:text-slate-200 backdrop-blur-md"
                      />
                    </div>
                    {selectedFile && (
                      <p className="text-xs text-slate-400 mt-1">
                        Archivo seleccionado: {selectedFile.name}. Se subirá al guardar.
                      </p>
                    )}
                    {!selectedFile && formData.avatar_url && (
                      <p className="text-xs text-slate-400 mt-1">
                        URL actual: <a href={formData.avatar_url} target="_blank" rel="noopener noreferrer" className="underline">{formData.avatar_url.substring(0, 30)}...</a>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-200 font-medium">Biografía</Label>
                    <Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60" />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving || uploading} className="w-full mt-4 h-12 rounded-2xl bg-white text-slate-950 hover:bg-blue-50 font-bold">
                    {uploading ? "Subiendo imagen..." : saving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {isGestor && gestorStats && (
              <section className="rounded-[2rem] border border-white/25 nc-liquid nc-sheen p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                  <h2 className="font-display text-2xl font-bold flex items-center gap-2 text-white">
                    <Wallet className="w-6 h-6 text-cyan-300" /> Resumen de Gestor
                  </h2>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={sendToWhatsApp} className="rounded-full bg-green-500/20 border border-green-400/30 text-green-200 hover:bg-green-500/30">
                      <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp Admin
                    </Button>
                    <Button size="sm" onClick={handleRequestPayment} disabled={requestingPayment} className="rounded-full bg-white text-slate-950 hover:bg-blue-50 font-bold">
                      <Send className="w-4 h-4 mr-2" /> Pedir Pago
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400 mb-1">
                      <Clock className="w-3 h-3" /> Pendiente
                    </div>
                    <div className="text-2xl font-bold text-amber-300">{formatCUP(gestorStats.bySeller[0]?.pendingCommission || 0)}</div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400 mb-1">
                      <CheckCircle className="w-3 h-3" /> Pagado
                    </div>
                    <div className="text-2xl font-bold text-emerald-300">{formatCUP(gestorStats.bySeller[0]?.paidCommission || 0)}</div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400 mb-1">
                      <Package className="w-3 h-3" /> Ventas
                    </div>
                    <div className="text-2xl font-bold text-cyan-200">{gestorStats.bySeller[0]?.count || 0}</div>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-[2rem] border border-white/25 nc-liquid nc-sheen p-6">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2 text-white">
                <Package className="w-5 h-5 text-cyan-300" /> Mis pedidos
              </h2>
              {orders.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <p className="text-slate-400">No tienes pedidos todavía.</p>
                  <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-blue-50 font-bold px-6 h-12"><Link to="/tienda">Empezar a comprar</Link></Button>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {orders.map((o) => (
                    <div key={o.id} className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sm text-white">Pedido #{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(o.created_at).toLocaleString("es-CU")} · {Array.isArray(o.items) ? o.items.length : 0} productos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-cyan-200">{formatPrice(o.total)}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-slate-300 capitalize">{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;

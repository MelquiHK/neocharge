import { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, formatCUP } from "@/lib/format";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { Package, LogOut, LayoutDashboard, User, Phone, Info, Save, MessageSquare, Wallet, CheckCircle, Clock, Map, Send, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import "@/components/sections/visual-effects.css";
import { computeSalesTotalsBySeller, type SellerSale } from "@/lib/sales";
import { normalizeCubanPhone, formatCubanPhoneDisplay } from "@/lib/cuban-phone";
import { RegistrarVentaDialog } from "@/components/gestor/RegistrarVentaDialog";
import { VentasHistorial } from "@/components/gestor/VentasHistorial";
import { SolicitudesPago } from "@/components/gestor/SolicitudesPago";
import { useSEO } from "@/hooks/use-seo";

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

const PhonePrompt = ({
  onSaved,
}: {
  onSaved: () => void;
}) => {
  // Quienes entran con Google no pasan por el formulario de registro:
  // se les pide el teléfono aquí, sin bloquear el resto de la cuenta.
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const normalized = normalizeCubanPhone(phone);
    if (!normalized) {
      setError("Escribe un móvil cubano válido (ej. 5XXX XXXX).");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ phone: normalized, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (dbError) throw dbError;
      toast.success("Teléfono guardado. ¡Gracias!");
      onSaved();
    } catch (err: unknown) {
      toast.error("No se pudo guardar el teléfono: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[2rem] border-2 border-dashed border-brand-300 bg-brand-50/80 p-6 sm:p-7 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-grape-600 flex items-center justify-center shrink-0 shadow-glow-brand-sm">
          <Phone className="w-5 h-5 text-white" />
        </span>
        <div className="flex-1 space-y-1">
          <h2 className="font-display text-xl font-bold nc-title-gradient">Completa tu teléfono</h2>
          <p className="text-sm text-slate-500">
            Lo necesitamos para rastrear tus pedidos y coordinar la entrega por WhatsApp.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (error) setError("");
          }}
          placeholder="5XXX XXXX"
          inputMode="tel"
          autoComplete="tel"
          aria-label="Teléfono móvil"
          className="nc-input h-12 sm:max-w-xs"
        />
        <Button onClick={save} disabled={saving} className="nc-btn-primary h-12 px-6 font-bold">
          {saving ? "Guardando..." : "Guardar teléfono"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 font-medium mt-2">{error}</p>
      )}
    </section>
  );
};

const Account = () => {
  useSEO("account");
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
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // (El título y los meta tags los gestiona useSEO("account").)

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        phone: profile.phone ? formatCubanPhoneDisplay(profile.phone) : "",
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
      // Lectura de conveniencia: si falla, la lista queda vacía.
      .then(({ data }) => data && setOrders(data as Order[]))
      .catch(() => {});

    if (!isGestor) return;

    // Load sales if gestor
    const loadSales = () => {
      supabase
        .from("seller_sales")
        .select("*")
        .eq("seller_user_id", user.id)
        .order("created_at", { ascending: false })
        // Lectura de conveniencia: si falla, la lista queda vacía.
        .then(({ data }) => data && setGestorSales(data))
        .catch(() => {});
    };
    const checkPendingRequest = () => {
      supabase
        .from("payment_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1)
        // Lectura de conveniencia: si falla, se asume sin solicitud pendiente.
        .then(({ data }) => setHasPendingRequest(!!data && data.length > 0))
        .catch(() => {});
    };
    loadSales();
    checkPendingRequest();

    // Realtime: las ventas y solicitudes se actualizan solas (ej. cuando el
    // admin marca una comisión como pagada o aprueba una solicitud).
    const salesChannel = supabase
      .channel(`gestor-sales-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seller_sales", filter: `seller_user_id=eq.${user.id}` },
        () => loadSales()
      )
      .subscribe();
    const payChannel = supabase
      .channel(`gestor-payments-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_requests", filter: `user_id=eq.${user.id}` },
        () => checkPendingRequest()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(payChannel);
    };
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

      const { error: uploadError } = await supabase.storage
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
      // El teléfono, si se escribe, debe ser un móvil cubano válido.
      let normalizedPhone: string | null = null;
      if (formData.phone.trim()) {
        normalizedPhone = normalizeCubanPhone(formData.phone);
        if (!normalizedPhone) {
          toast.error("El teléfono no es un móvil cubano válido (ej. 5XXX XXXX).");
          setSaving(false);
          return;
        }
      }
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
          phone: normalizedPhone,
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
    if (hasPendingRequest) {
      toast.error("Ya tienes una solicitud de pago en revisión.");
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
      setHasPendingRequest(true);
      toast.success("Solicitud de pago enviada al administrador.");
    } catch (error: unknown) {
      toast.error("Error al solicitar pago: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setRequestingPayment(false);
    }
  };

  const handleSaleSaved = () => {
    // Recarga inmediata (el realtime también lo haría, pero así se ve al instante).
    if (!user) return;
    supabase
      .from("seller_sales")
      .select("*")
      .eq("seller_user_id", user.id)
      .order("created_at", { ascending: false })
      // Lectura de conveniencia: si falla, el realtime actualiza solo.
      .then(({ data }) => data && setGestorSales(data))
      .catch(() => {});
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

    window.open(getWhatsAppLink(message), "_blank");
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden">
        <div className="nc-wash-a" aria-hidden />
        <div className="nc-wash-b" aria-hidden />
        <div className="relative container-page py-20 space-y-4">
          <div className="h-8 bg-slate-200/70 rounded animate-pulse w-1/3" />
          <div className="h-4 bg-slate-200/70 rounded animate-pulse w-1/2" />
          <div className="space-y-3 mt-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-200/70 rounded-3xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="relative overflow-hidden">
      {/* Lavados de color + orbes */}
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-brand-300/30 blur-[130px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-52 -left-32 w-[480px] h-[480px] rounded-full bg-brand-200/25 blur-[120px] pointer-events-none"
        aria-hidden
      />

      <div className="relative container-page py-8 md:py-12 space-y-8">
        {/* Héroe de la cuenta */}
        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-7 sm:p-10 text-white shadow-xl shadow-brand-500/25 animate-fade-in-up">
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div
            className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-black/25 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 shadow-lg shrink-0 bg-white/10 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-9 h-9 text-white/70" />
                )}
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-bold uppercase tracking-widest">
                  {role === "owner" ? "Dueño Supremo" : role === "admin" ? "Administrador" : role === "gestor" ? "Gestor de Ventas" : role === "mensajero" ? "Mensajero" : "Perfil de Cliente"}
                </div>
                <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Mi cuenta</h1>
                <p className="text-white/75 font-light">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {isAdmin && (
                <Button asChild className="rounded-full bg-white text-brand-900 hover:bg-brand-50 font-bold shadow-lg h-11 px-5">
                  <Link to="/admin"><LayoutDashboard className="w-4 h-4 mr-2" /> Panel admin</Link>
                </Button>
              )}
              {isMensajero && (
                <Button asChild className="rounded-full bg-white text-brand-900 hover:bg-brand-50 font-bold shadow-lg h-11 px-5">
                  <Link to="/mensajeria"><Map className="w-4 h-4 mr-2" /> Panel Mensajero</Link>
                </Button>
              )}
              <Button
                onClick={() => setEditing(!editing)}
                className="rounded-full bg-white/15 backdrop-blur border border-white/25 text-white hover:bg-white/25 font-semibold h-11 px-5"
              >
                {editing ? "Cancelar" : "Editar perfil"}
              </Button>
              <Button
                asChild
                className="rounded-full bg-white/15 backdrop-blur border border-white/25 text-white hover:bg-white/25 font-semibold h-11 px-5"
              >
                <Link to="/ajustes"><Settings className="w-4 h-4 mr-2" /> Ajustes</Link>
              </Button>
              <Button
                onClick={signOut}
                className="rounded-full bg-red-500/20 backdrop-blur border border-red-300/30 text-red-100 hover:bg-red-500/30 font-semibold h-11 px-5"
              >
                <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
              </Button>
            </div>
          </div>
        </header>

        {/* Teléfono pendiente (p. ej. cuentas creadas con Google) */}
        {profile && !profile.phone && (
          <PhonePrompt onSaved={() => refreshProfile()} />
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white/85 backdrop-blur-xl rounded-[2rem] p-6 sm:p-7 space-y-5 shadow-xl shadow-brand-500/10 border border-white animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <div className="text-center space-y-1.5">
                <h3 className="font-display text-2xl font-bold nc-title-gradient">{profile?.full_name || profile?.username}</h3>
                <p className="text-sm text-slate-400">@{profile?.username}</p>
              </div>

              <div className="space-y-3 pt-5 border-t border-brand-100">
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-brand-700" />
                  </span>
                  <span className="font-medium text-slate-700">{profile?.phone ? formatCubanPhoneDisplay(profile.phone) : "Sin teléfono"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4 text-brand-700" />
                  </span>
                  <p className="text-slate-500 italic pt-1.5">{(profile as ProfileWithBio | null)?.bio || "Sin biografía"}</p>
                </div>
              </div>
            </section>

            {editing && (
              <section className="glass-strong rounded-[2rem] p-6 space-y-4 animate-fade-in-up">
                <h3 className="font-bold flex items-center gap-2 nc-title-gradient"><Save className="w-4 h-4" /> Editar Datos</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-slate-700 font-medium">Nombre Completo</Label>
                    <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="nc-input h-12" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-700 font-medium">Nombre de Usuario</Label>
                    <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="nc-input h-12" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-700 font-medium">Teléfono</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="nc-input h-12" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="avatar-upload" className="text-slate-700 font-medium">Foto de Perfil</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-brand-200/70">
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
                        id="avatar-upload"
                        accept="image/*"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                        className="flex-grow h-12 rounded-2xl bg-white/70 border border-slate-200/80 text-slate-700 backdrop-blur-md file:mr-3 file:rounded-xl file:border-0 file:bg-brand-200 file:px-3 file:py-1.5 file:font-semibold file:text-slate-900"
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
                    <Label className="text-slate-700 font-medium">Biografía</Label>
                    <Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="nc-input" />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving || uploading} className="nc-btn-primary w-full mt-4 h-12">
                    {uploading ? "Subiendo imagen..." : saving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {isGestor && gestorStats && (
              <section className="glass-strong rounded-[2rem] p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                  <h2 className="font-display text-2xl font-bold flex items-center gap-2 nc-title-gradient">
                    <Wallet className="w-6 h-6 text-brand-600" /> Panel de Gestor
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setSaleDialogOpen(true)} className="rounded-full bg-gradient-to-br from-brand-500 via-brand-600 to-grape-600 text-white hover:brightness-105 font-bold shadow-glow-brand-sm">
                      <Plus className="w-4 h-4 mr-2" /> Registrar venta
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRequestPayment}
                      disabled={requestingPayment || hasPendingRequest}
                      title={hasPendingRequest ? "Ya tienes una solicitud en revisión" : "Pedir el pago de tus comisiones pendientes"}
                      className="rounded-full glass text-slate-700 hover:bg-white/90 font-semibold disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 mr-2" /> {hasPendingRequest ? "Pago en revisión" : "Pedir Pago"}
                    </Button>
                    <Button size="sm" onClick={sendToWhatsApp} className="rounded-full bg-green-500/10 border border-green-300/50 text-green-700 hover:bg-green-500/20 font-semibold">
                      <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp Admin
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="glass p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400 mb-1">
                      <Clock className="w-3 h-3" /> Pendiente
                    </div>
                    <div className="text-2xl font-bold text-amber-600">{formatCUP(gestorStats.bySeller[0]?.pendingCommission || 0)}</div>
                  </div>
                  <div className="glass p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400 mb-1">
                      <CheckCircle className="w-3 h-3" /> Pagado
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">{formatCUP(gestorStats.bySeller[0]?.paidCommission || 0)}</div>
                  </div>
                  <div className="glass p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400 mb-1">
                      <Package className="w-3 h-3" /> Ventas
                    </div>
                    <div className="text-2xl font-bold text-brand-700">{gestorStats.bySeller[0]?.count || 0}</div>
                  </div>
                </div>
              </section>
            )}

            {isGestor && (
              <VentasHistorial sales={gestorSales} />
            )}

            {isGestor && user && (
              <SolicitudesPago userId={user.id} />
            )}

            <section className="glass-strong rounded-[2rem] p-6">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2 nc-title-gradient">
                <Package className="w-5 h-5 text-brand-600" /> Mis pedidos
              </h2>
              {orders.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <p className="text-slate-400">No tienes pedidos todavía.</p>
                  <Button asChild className="rounded-full bg-gradient-to-br from-brand-500 via-brand-600 to-grape-600 text-white hover:brightness-105 font-bold px-6 h-12 shadow-glow-brand-sm"><Link to="/tienda">Empezar a comprar</Link></Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/70">
                  {orders.map((o) => (
                    <div key={o.id} className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sm">Pedido #{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(o.created_at).toLocaleString("es-CU")} · {Array.isArray(o.items) ? o.items.length : 0} productos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-brand-700">{formatPrice(o.total)}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 border border-brand-200 text-brand-800 capitalize font-semibold">{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {isGestor && (
        <RegistrarVentaDialog
          open={saleDialogOpen}
          onOpenChange={setSaleDialogOpen}
          onSaved={handleSaleSaved}
        />
      )}
    </div>
  );
};

export default Account;

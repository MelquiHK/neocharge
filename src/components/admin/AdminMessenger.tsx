import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCUP } from "@/lib/format";
import { MapPin, Plus, Trash2, CheckCircle, XCircle, Store, Wallet, User, Navigation, Truck, UserPlus, Bike, Power } from "lucide-react";
import {
  AdminCard,
  AdminSectionHeader,
  AdminCardTitle,
  AdminEmptyState,
  AdminLoading,
  StatusBadge,
  AdminTable,
  AdminTableHead,
  adminTh,
  adminTd,
  adminTr,
} from "./ui";

export function AdminMessenger() {
  interface SalePointRow {
    id: string;
    name: string;
    address?: string | null;
    lat?: number | string | null;
    lng?: number | string | null;
    [key: string]: unknown;
  }
  interface PaymentRequestRow {
    id: string;
    amount?: number | string | null;
    status?: string | null;
    created_at?: string | null;
    profiles?: { full_name?: string | null; username?: string | null } | null;
    [key: string]: unknown;
  }
  const [salePoints, setSalePoints] = useState<SalePointRow[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestRow[]>([]);
  const [newPoint, setNewPoint] = useState({ name: "", address: "", lat: 23.1136, lng: -82.3666 });
  const [loading, setLoading] = useState(true);

  // Cuentas de mensajero (app NeoCharge Mensajero)
  interface MessengerRow {
    user_id: string;
    full_name?: string | null;
    phone?: string | null;
    vehicle_type?: string | null;
    is_active: boolean;
  }
  const [messengers, setMessengers] = useState<MessengerRow[]>([]);
  const [newMessenger, setNewMessenger] = useState({ full_name: "", phone: "", email: "", password: "", vehicle_type: "motorcycle" });
  const [creatingMessenger, setCreatingMessenger] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Tarifa pública de envío (calculadora /calcular-envio + bot de WhatsApp)
  const [deliveryPrice, setDeliveryPrice] = useState(250);
  const [deliveryOriginId, setDeliveryOriginId] = useState("");
  const [savingDelivery, setSavingDelivery] = useState(false);

  const loadMessengers = useCallback(async () => {
    const { data: mps } = await supabase
      .from("messenger_profiles")
      .select("user_id, is_active, vehicle_type")
      .order("updated_at", { ascending: false });
    const rows = (mps ?? []) as { user_id: string; is_active: boolean; vehicle_type?: string | null }[];
    if (rows.length === 0) {
      setMessengers([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", rows.map((r) => r.user_id));
    const byId = new Map(
      (profs ?? []).map((p) => [String(p.id), p as { full_name?: string | null; phone?: string | null }]),
    );
    setMessengers(
      rows.map((r) => ({
        user_id: r.user_id,
        is_active: r.is_active !== false,
        vehicle_type: r.vehicle_type ?? null,
        full_name: byId.get(r.user_id)?.full_name ?? null,
        phone: byId.get(r.user_id)?.phone ?? null,
      })),
    );
  }, []);

  // Llama al endpoint del servidor con el JWT de la sesión actual.
  // Crear cuentas y activar/desactivar exige la llave service_role,
  // que vive solo en el servidor (api/create-messenger.js).
  const callMessengerApi = useCallback(async (payload: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch("/api/create-messenger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await resp.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!resp.ok || !data?.ok) {
      throw new Error(data?.message || "Algo salió mal. Revisa tu conexión e inténtalo de nuevo.");
    }
    return data;
  }, []);

  const createMessenger = async () => {
    if (!newMessenger.full_name.trim()) return toast.error("El nombre es obligatorio");
    if (!newMessenger.email.trim()) return toast.error("El correo es obligatorio");
    if (newMessenger.password.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    setCreatingMessenger(true);
    try {
      await callMessengerApi({ action: "create", ...newMessenger });
      toast.success("Cuenta de mensajero creada. Ya puede entrar a la app con su correo y contraseña.");
      setNewMessenger({ full_name: "", phone: "", email: "", password: "", vehicle_type: "motorcycle" });
      await loadMessengers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setCreatingMessenger(false);
    }
  };

  const toggleMessenger = async (m: MessengerRow) => {
    setTogglingId(m.user_id);
    try {
      await callMessengerApi({ action: "set_active", user_id: m.user_id, is_active: !m.is_active });
      toast.success(m.is_active ? "Mensajero desactivado. Ya no puede entrar a la app." : "Mensajero activado. Ya puede entrar a la app.");
      await loadMessengers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    } finally {
      setTogglingId(null);
    }
  };

  const vehicleLabel = (v?: string | null) =>
    v === "motorcycle" ? "Moto" : v === "bicycle" ? "Bicicleta" : v === "car" ? "Carro" : "—";

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: points }, { data: requests }, { data: dcfg }] = await Promise.all([
      supabase.from("sale_points").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_requests").select("*, profiles:user_id(full_name, username)").order("created_at", { ascending: false }),
      supabase.from("site_settings").select("value").eq("key", "delivery_config").maybeSingle()
    ]);
    setSalePoints(
      (points ?? []).map((p) => ({
        ...p,
        id: String(p.id),
        name: String(p.name ?? ""),
      })),
    );
    setPaymentRequests(
      (requests ?? []).map((r) => ({
        ...r,
        id: String(r.id),
        profiles: (r.profiles as unknown as PaymentRequestRow["profiles"]) ?? null,
      })),
    );
    const v = dcfg?.value as { price_per_km?: unknown; origin_sale_point_id?: unknown } | null | undefined;
    if (v) {
      if (Number.isFinite(Number(v.price_per_km)) && Number(v.price_per_km) > 0) {
        setDeliveryPrice(Number(v.price_per_km));
      }
      if (v.origin_sale_point_id) setDeliveryOriginId(String(v.origin_sale_point_id));
    }
    await loadMessengers();
    setLoading(false);
  }, [loadMessengers]);

  const saveDeliveryConfig = async () => {
    if (!Number.isFinite(deliveryPrice) || deliveryPrice <= 0) {
      return toast.error("El precio por km debe ser mayor que 0");
    }
    setSavingDelivery(true);
    const { error } = await supabase.from("site_settings").upsert(
      {
        key: "delivery_config",
        value: { price_per_km: deliveryPrice, origin_sale_point_id: deliveryOriginId || null },
      },
      { onConflict: "key" }
    );
    setSavingDelivery(false);
    if (error) toast.error("Error: " + error.message);
    else toast.success("Tarifa de envío guardada");
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addPoint = async () => {
    if (!newPoint.name) return toast.error("El nombre es obligatorio");
    const { error } = await supabase.from("sale_points").insert(newPoint);
    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Punto de venta añadido");
      setNewPoint({ name: "", address: "", lat: 23.1136, lng: -82.3666 });
      loadData();
    }
  };

  const deletePoint = async (id: string) => {
    const { error } = await supabase.from("sale_points").delete().eq("id", id);
    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Punto de venta eliminado");
      loadData();
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("payment_requests").update({ status }).eq("id", id);
    if (error) toast.error("Error: " + error.message);
    else {
      toast.success(`Solicitud ${status}`);
      loadData();
    }
  };

  const statusTone = (s?: string | null): "warning" | "info" | "success" | "danger" =>
    s === "pending" ? "warning" : s === "approved" ? "info" : s === "paid" ? "success" : "danger";
  const statusLabel = (s?: string | null) =>
    s === "pending" ? "Pendiente" : s === "paid" ? "Pagado" : s === "approved" ? "Aprobado" : "Rechazado";

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminSectionHeader
          icon={Truck}
          title="Mensajería"
          description="Tarifa de envío, puntos de despacho y pagos de gestores."
        />
        <AdminLoading label="Cargando mensajería…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={Truck}
        title="Mensajería"
        description="Tarifa de envío, puntos de despacho y pagos de gestores."
      />

      {/* Tarifa pública de envío (calculadora /calcular-envio + bot de WhatsApp) */}
      <AdminCard>
        <AdminCardTitle icon={Navigation} title="Tarifa de envío para clientes" />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Esta tarifa la usan la calculadora pública (/calcular-envio) y el bot de WhatsApp.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="delivery-price">Precio por km (CUP)</Label>
            <div className="relative">
              <Input
                id="delivery-price"
                type="number"
                min={0}
                inputMode="decimal"
                value={deliveryPrice}
                onChange={(e) => setDeliveryPrice(Number(e.target.value))}
                className="h-14 pr-16 text-2xl font-bold tracking-tight"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                CUP/km
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-origin">Local origen de los envíos</Label>
            <select
              id="delivery-origin"
              value={deliveryOriginId}
              onChange={(e) => setDeliveryOriginId(e.target.value)}
              className="h-14 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Automático (Vedado o el primero)</option>
              {salePoints.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button variant="hero" onClick={saveDeliveryConfig} disabled={savingDelivery} className="mt-5 h-11 w-full rounded-xl sm:w-auto sm:px-8">
          {savingDelivery ? "Guardando…" : "Guardar tarifa"}
        </Button>
      </AdminCard>

      {/* Cuentas de mensajero (app NeoCharge Mensajero) */}
      <AdminCard>
        <AdminCardTitle
          icon={Bike}
          title="Cuentas de mensajero"
          action={<StatusBadge tone="neutral">{messengers.length}</StatusBadge>}
        />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Crea aquí la cuenta de un mensajero: con ese correo y contraseña entra enseguida a la app
          NeoCharge Mensajero. Si lo desactivas, la app no lo deja entrar.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input className="h-11" value={newMessenger.full_name} onChange={e => setNewMessenger({ ...newMessenger, full_name: e.target.value })} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input className="h-11" value={newMessenger.phone} onChange={e => setNewMessenger({ ...newMessenger, phone: e.target.value })} placeholder="Ej: 51234567" inputMode="tel" />
            </div>
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input className="h-11" type="email" value={newMessenger.email} onChange={e => setNewMessenger({ ...newMessenger, email: e.target.value })} placeholder="Ej: juan@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Contraseña (mínimo 8 caracteres)</Label>
              <Input className="h-11" type="text" value={newMessenger.password} onChange={e => setNewMessenger({ ...newMessenger, password: e.target.value })} placeholder="La que usará para entrar" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label>Vehículo</Label>
              <select
                value={newMessenger.vehicle_type}
                onChange={e => setNewMessenger({ ...newMessenger, vehicle_type: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="motorcycle">Moto</option>
                <option value="bicycle">Bicicleta</option>
                <option value="car">Carro</option>
              </select>
            </div>
            <Button variant="hero" onClick={createMessenger} disabled={creatingMessenger} className="h-11 w-full rounded-xl">
              <UserPlus className="mr-2 h-4 w-4" />
              {creatingMessenger ? "Creando…" : "Crear cuenta de mensajero"}
            </Button>
          </div>
          <div className="space-y-3 lg:col-span-2">
            {messengers.length === 0 ? (
              <AdminEmptyState
                icon={Bike}
                title="Todavía no hay mensajeros"
                description="Crea la primera cuenta con el formulario."
                className="py-8"
              />
            ) : (
              messengers.map(m => (
                <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{m.full_name || "Sin nombre"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {vehicleLabel(m.vehicle_type)}{m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge tone={m.is_active ? "success" : "danger"}>
                      {m.is_active ? "Activo" : "Desactivado"}
                    </StatusBadge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMessenger(m)}
                      disabled={togglingId === m.user_id}
                      className="h-10 px-3"
                    >
                      <Power className="mr-1 h-4 w-4" />
                      {togglingId === m.user_id ? "…" : m.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AdminCard>

      {/* Sale Points Management */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard>
          <AdminCardTitle icon={Plus} title="Nuevo punto de venta" />
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre del local</Label>
              <Input className="h-11" value={newPoint.name} onChange={e => setNewPoint({...newPoint, name: e.target.value})} placeholder="Ej: Almacén Central" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input className="h-11" value={newPoint.address} onChange={e => setNewPoint({...newPoint, address: e.target.value})} placeholder="Ej: Calle 10 #5..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Latitud</Label>
                <Input className="h-11" type="number" inputMode="decimal" value={newPoint.lat} onChange={e => setNewPoint({...newPoint, lat: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Longitud</Label>
                <Input className="h-11" type="number" inputMode="decimal" value={newPoint.lng} onChange={e => setNewPoint({...newPoint, lng: Number(e.target.value)})} />
              </div>
            </div>
            <Button variant="hero" onClick={addPoint} className="mt-1 h-11 w-full rounded-xl">Añadir punto</Button>
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <AdminCardTitle
            icon={Store}
            title="Puntos de venta activos"
            action={<StatusBadge tone="neutral">{salePoints.length}</StatusBadge>}
          />
          {salePoints.length === 0 ? (
            <AdminEmptyState
              icon={Store}
              title="No hay puntos de venta"
              description="Añade el primero con el formulario."
              className="py-8"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {salePoints.map(p => (
                <div key={p.id} className="flex items-start justify-between gap-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold">{p.name}</p>
                    {p.address && (
                      <p className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{p.address}</span>
                      </p>
                    )}
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {Number(p.lat ?? 0).toFixed(4)}, {Number(p.lng ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePoint(p.id)}
                    className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                    aria-label={`Eliminar ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      {/* Payment Requests */}
      <AdminCard>
        <AdminCardTitle
          icon={Wallet}
          title="Solicitudes de pago de gestores"
          action={<StatusBadge tone="neutral">{paymentRequests.length}</StatusBadge>}
        />
        {paymentRequests.length === 0 ? (
          <AdminEmptyState
            icon={Wallet}
            title="Sin solicitudes de pago"
            description="No hay solicitudes de pago de gestores por ahora."
            className="py-8"
          />
        ) : (
          <AdminTable className="border-0">
            <AdminTableHead>
              <tr>
                <th className={adminTh}>Gestor</th>
                <th className={adminTh}>Monto</th>
                <th className={adminTh}>Fecha</th>
                <th className={adminTh}>Estado</th>
                <th className={`${adminTh} text-right`}>Acciones</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {paymentRequests.map(r => (
                <tr key={r.id} className={adminTr}>
                  <td className={adminTd}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{r.profiles?.full_name || r.profiles?.username}</p>
                        {r.profiles?.username && (
                          <p className="text-[10px] text-muted-foreground">@{r.profiles?.username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={adminTd}>
                    <span className="whitespace-nowrap font-bold text-primary">{formatCUP(Number(r.amount ?? 0))}</span>
                  </td>
                  <td className={adminTd}>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("es-CU")}
                    </span>
                  </td>
                  <td className={adminTd}>
                    <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>
                  </td>
                  <td className={adminTd}>
                    <div className="flex items-center justify-end gap-2">
                      {r.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" className="h-10 px-3 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300" onClick={() => updateRequestStatus(r.id, 'approved')}>
                            <CheckCircle className="mr-1 h-4 w-4" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="h-10 px-3 text-destructive hover:bg-destructive/10" onClick={() => updateRequestStatus(r.id, 'rejected')}>
                            <XCircle className="mr-1 h-4 w-4" /> Rechazar
                          </Button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <Button size="sm" variant="hero" className="h-10 px-3" onClick={() => updateRequestStatus(r.id, 'paid')}>
                          Marcar pagado
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}

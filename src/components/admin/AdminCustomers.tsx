import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatPrice, formatCUP } from "@/lib/format";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, Trash2, Shield, ShoppingBag, UserCog, Map, Users, Search, Wallet } from "lucide-react";
import { UserRole } from "@/types";
import {
  AdminCard,
  AdminSectionHeader,
  AdminCardTitle,
  AdminStat,
  AdminEmptyState,
  StatusBadge,
  AdminTable,
  AdminTableHead,
  adminTh,
  adminTd,
  adminTr,
  AdminFilters,
  AdminLoading,
} from "./ui";

interface Customer {
  id: string;
  full_name: string | null;
  username: string;
  phone: string | null;
  created_at: string;
  role?: UserRole;
}

interface OrderHistory {
  id: string;
  total: number;
  status: string;
  created_at: string;
  items: unknown[];
  payment_currency?: string | null;
  exchange_rate?: number | null;
}

interface AdminPerms {
  [key: string]: unknown;
}

interface MessengerProfile {
  rate_per_km?: number | null;
  vehicle_type?: string | null;
}

type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

/** Tono del badge según el rol real del usuario (solo presentación). */
function roleTone(role?: UserRole): BadgeTone {
  switch (role) {
    case "owner":
    case "admin":
      return "primary";
    case "gestor":
      return "success";
    case "mensajero":
      return "warning";
    default:
      return "neutral";
  }
}

/** Inicial para el avatar a partir del nombre o el usuario. */
function initialOf(c: Customer): string {
  const base = (c.full_name?.trim() || c.username || "?").trim();
  return base.charAt(0).toUpperCase();
}

export function AdminCustomers() {
  const { permissions } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [perms, setPerms] = useState<AdminPerms | null>(null);
  const [messengerProfile, setMessengerProfile] = useState<MessengerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,username,phone,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role")
    ]);
    
    const combined = (profiles ?? []).map(p => ({
      ...p,
      role: roles?.find(r => r.user_id === p.id)?.role as UserRole || "user"
    }));
    
    setCustomers(combined as Customer[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCustomer = async (c: Customer) => {
    setViewing(c);
    const [{ data: orders }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at,items,payment_currency,exchange_rate").eq("user_id", c.id).order("created_at", { ascending: false }),
      supabase.from("admin_permissions").select("*").eq("user_id", c.id).maybeSingle(),
      supabase.from("messenger_profiles").select("*").eq("user_id", c.id).maybeSingle(),
    ]);
    setHistory((orders ?? []) as OrderHistory[]);
    setPerms(p);
    setMessengerProfile(m);
  };

  const totalSpentUSD = history.reduce((s, o: OrderHistory) => {
    if (o.payment_currency === "CUP") {
      const rate = o.exchange_rate || 1;
      return s + (Number(o.total ?? 0) / rate);
    }
    return s + Number(o.total ?? 0);
  }, 0);

  const clearHistory = async () => {
    if (!viewing) return;
    const { error } = await supabase.from("orders").delete().eq("user_id", viewing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Historial borrado");
    setHistory([]);
  };

  const togglePerm = async (key: string, value: boolean) => {
    if (!viewing) return;
    if (!perms) {
      // Ensure they have the admin role if giving admin perms
      await supabase.from("user_roles").upsert({ user_id: viewing.id, role: "admin" as UserRole }, { onConflict: "user_id,role" });
      const insertPayload: Record<string, unknown> = { user_id: viewing.id, [key]: value };
      const { data } = await supabase.from("admin_permissions").insert(insertPayload as TablesInsert<"admin_permissions">).select().single();
      setPerms(data);
    } else {
      const updatePayload: Record<string, unknown> = { [key]: value };
      const { data } = await supabase.from("admin_permissions").update(updatePayload as TablesUpdate<"admin_permissions">).eq("user_id", viewing.id).select().single();
      setPerms(data);
    }
    toast.success("Permisos actualizados");
    load();
  };

  const updateRole = async (newRole: UserRole) => {
    if (!viewing) return;
    try {
      // First remove existing roles to keep it simple (one role per user in this logic)
      await supabase.from("user_roles").delete().eq("user_id", viewing.id);
      
      // Add new role
      const { error } = await supabase.from("user_roles").insert({
        user_id: viewing.id,
        role: newRole as UserRole
      });

      if (error) throw error;
      
      setViewing({ ...viewing, role: newRole });
      toast.success(`Rol actualizado a ${newRole}`);
      load();
    } catch (error: unknown) {
      toast.error("Error al actualizar rol: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const removeAdmin = async () => {
    if (!viewing) return;
    await Promise.all([
      supabase.from("admin_permissions").delete().eq("user_id", viewing.id),
      supabase.from("user_roles").delete().eq("user_id", viewing.id).eq("role", "admin" as UserRole),
    ]);
    setPerms(null);
    toast.success("Acceso de administrador removido");
  };

  const deleteUser = async () => {
    if (!viewing) return;
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(viewing.id);
      if (authError) throw authError;

      // Also delete from profiles table
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", viewing.id);
      if (profileError) throw profileError;

      toast.success("Cliente eliminado exitosamente.");
      setViewing(null);
      load(); // Reload the customer list
    } catch (error: unknown) {
      toast.error("Error al eliminar cliente: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const PERM_LABELS: Record<string, string> = {
    can_manage_products: "Gestionar productos",
    can_manage_orders: "Gestionar pedidos",
    can_manage_customers: "Gestionar clientes",
    can_manage_locations: "Gestionar locales",
    can_manage_blog: "Gestionar blog",
    can_manage_rates: "Gestionar tasa de cambio",
    can_view_finances: "Ver finanzas e ingresos",
    can_manage_admins: "Gestionar otros admins",
  };

  const filtered = customers.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.full_name, c.username, c.phone, c.role].some((v) =>
      (v ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={Users}
        title="Clientes"
        description="Tu base de clientes e historial de compras."
      />

      <AdminFilters>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, usuario o teléfono…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">
          {filtered.length} de {customers.length} clientes
        </p>
      </AdminFilters>

      <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
        {loading ? (
          <AdminLoading label="Cargando clientes…" />
        ) : filtered.length === 0 ? (
          <div className="p-4 sm:p-6">
            <AdminEmptyState
              icon={Users}
              title={query ? "Sin resultados" : "Aún no hay clientes"}
              description={
                query
                  ? `No encontramos clientes que coincidan con "${query}".`
                  : "Cuando alguien se registre en la tienda aparecerá aquí."
              }
            />
          </div>
        ) : (
          <AdminTable className="rounded-none border-0">
            <AdminTableHead>
              <tr>
                <th className={adminTh}>Cliente</th>
                <th className={adminTh}>Rol</th>
                <th className={adminTh}>Teléfono</th>
                <th className={adminTh}>Registrado</th>
                <th className={`${adminTh} text-right`}>Acciones</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={adminTr}>
                  <td className={adminTd}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {initialOf(c)}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">{c.full_name ?? "—"}</span>
                        <span className="truncate text-xs text-muted-foreground">@{c.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className={adminTd}>
                    <StatusBadge tone={roleTone(c.role)}>{c.role || "user"}</StatusBadge>
                  </td>
                  <td className={adminTd}>{c.phone ?? "—"}</td>
                  <td className={adminTd}>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("es-CU")}
                    </span>
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <Button size="sm" variant="ghost" onClick={() => openCustomer(c)} className="h-9">
                      <Eye className="w-4 h-4" /> Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </section>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 text-left">
              {viewing && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                  {initialOf(viewing)}
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle className="truncate">{viewing?.full_name ?? viewing?.username}</DialogTitle>
                <DialogDescription className="truncate">
                  @{viewing?.username} · {viewing?.phone ?? "Sin teléfono"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {viewing && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <AdminStat icon={ShoppingBag} label="Pedidos" value={history.length} tone="blue" />
                <AdminStat icon={Wallet} label="Total gastado" value={formatPrice(totalSpentUSD)} tone="emerald" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold">Historial de compras</h3>
                  {history.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-9 text-destructive"><Trash2 className="w-4 h-4" /> Borrar historial</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Borrar todo el historial?</AlertDialogTitle>
                          <AlertDialogDescription>Se eliminarán los {history.length} pedidos de este cliente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={clearHistory} className="bg-destructive">Borrar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                {history.length === 0 ? (
                  <AdminEmptyState
                    icon={ShoppingBag}
                    title="Sin pedidos"
                    description="Este cliente aún no ha realizado compras."
                    className="py-8"
                  />
                ) : (
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {history.map((o) => (
                      <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-bold">
                            {o.payment_currency === "CUP" ? formatCUP(Number(o.total)) : formatPrice(Number(o.total))}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("es-CU")}</p>
                        </div>
                        <StatusBadge tone="neutral" className="capitalize">{o.status}</StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <AdminCard className="p-4 sm:p-5">
                <AdminCardTitle icon={UserCog} title="Asignar Rol" />
                <div className="space-y-2">
                  <Label>Seleccionar Rol Principal</Label>
                  <Select value={viewing.role || "user"} onValueChange={(v) => updateRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Dueño</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="mensajero">Mensajero</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="user">Usuario Regular</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground italic">
                    * Cambiar el rol reseteará los roles previos del usuario.
                  </p>
                </div>
              </AdminCard>

              {viewing.role === "mensajero" && (
                <AdminCard className="p-4 sm:p-5">
                  <AdminCardTitle icon={Map} title="Configuración de Mensajero" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tarifa por KM (CUP)</Label>
                      <Input 
                        type="number" 
                        value={messengerProfile?.rate_per_km || 300} 
                        onChange={async (e) => {
                          const val = Number(e.target.value);
                          const { data } = await supabase.from("messenger_profiles").upsert({
                            user_id: viewing.id,
                            rate_per_km: val,
                            updated_at: new Date().toISOString()
                          }).select().single();
                          setMessengerProfile(data);
                        }} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vehículo</Label>
                      <Select 
                        value={messengerProfile?.vehicle_type || "car"} 
                        onValueChange={async (v) => {
                          const { data } = await supabase.from("messenger_profiles").upsert({
                            user_id: viewing.id,
                            vehicle_type: v,
                            updated_at: new Date().toISOString()
                          }).select().single();
                          setMessengerProfile(data);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="car">Carro</SelectItem>
                          <SelectItem value="motorcycle">Moto</SelectItem>
                          <SelectItem value="bicycle">Bicicleta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AdminCard>
              )}

              {permissions.can_manage_admins && (viewing.role === "admin" || viewing.role === "owner" || viewing.role === "gestor") && (
                <div className="card-elevated p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Permisos de gestor / administrador</h3>
                    </div>
                    {perms && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={removeAdmin}>Quitar admin/gestor</Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(PERM_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key} className="text-sm">{label}</Label>
                        <Switch id={key} checked={!!perms?.[key]} onCheckedChange={(v) => togglePerm(key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {permissions.can_manage_admins && (viewing.role === "admin" || viewing.role === "owner") && (
                <div className="card-elevated p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Permisos de administrador</h3>
                    </div>
                    {perms && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={removeAdmin}>Quitar admin</Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(PERM_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key} className="text-sm">{label}</Label>
                        <Switch id={key} checked={!!perms?.[key]} onCheckedChange={(v) => togglePerm(key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-11">Eliminar Cliente</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de eliminar este cliente?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán permanentemente el cliente y todos sus datos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteUser} className="bg-destructive">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

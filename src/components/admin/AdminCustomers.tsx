import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatPrice, formatCUP } from "@/lib/format";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, Trash2, Shield, ShoppingBag, UserCog, Map } from "lucide-react";
import { UserRole } from "@/types";

interface Customer {
  id: string;
  full_name: string | null;
  username: string;
  phone: string | null;
  created_at: string;
  role?: UserRole;
}

interface OrderHistory {
  id: string; total: number; status: string; created_at: string; items: any[];
}

export function AdminCustomers() {
  const { permissions } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [perms, setPerms] = useState<any>(null);
  const [messengerProfile, setMessengerProfile] = useState<any>(null);

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,username,phone,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role")
    ]);
    
    const combined = (profiles ?? []).map(p => ({
      ...p,
      role: roles?.find(r => r.user_id === p.id)?.role as UserRole || "user"
    }));
    
    setCustomers(combined as any);
  };

  useEffect(() => { load(); }, []);

  const openCustomer = async (c: Customer) => {
    setViewing(c);
    const [{ data: orders }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at,items,payment_currency,exchange_rate").eq("user_id", c.id).order("created_at", { ascending: false }),
      supabase.from("admin_permissions").select("*").eq("user_id", c.id).maybeSingle(),
      supabase.from("messenger_profiles").select("*").eq("user_id", c.id).maybeSingle(),
    ]);
    setHistory((orders ?? []) as any);
    setPerms(p);
    setMessengerProfile(m);
  };

  const totalSpentUSD = history.reduce((s, o: any) => {
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
      await supabase.from("user_roles").upsert({ user_id: viewing.id, role: "admin" as any }, { onConflict: "user_id,role" });
      const insertPayload: any = { user_id: viewing.id, [key]: value };
      const { data } = await supabase.from("admin_permissions").insert(insertPayload).select().single();
      setPerms(data);
    } else {
      const updatePayload: any = { [key]: value };
      const { data } = await supabase.from("admin_permissions").update(updatePayload).eq("user_id", viewing.id).select().single();
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
        role: newRole as any
      });

      if (error) throw error;
      
      setViewing({ ...viewing, role: newRole });
      toast.success(`Rol actualizado a ${newRole}`);
      load();
    } catch (error: any) {
      toast.error("Error al actualizar rol: " + error.message);
    }
  };

  const removeAdmin = async () => {
    if (!viewing) return;
    await Promise.all([
      supabase.from("admin_permissions").delete().eq("user_id", viewing.id),
      supabase.from("user_roles").delete().eq("user_id", viewing.id).eq("role", "admin" as any),
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
    } catch (error: any) {
      toast.error("Error al eliminar cliente: " + error.message);
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{customers.length} clientes registrados</p>

      <div className="card-elevated p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Usuario / Rol</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Registrado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-3 px-4 font-semibold">{c.full_name ?? "—"}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">@{c.username}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full w-fit mt-1 ${
                        c.role === "owner" ? "bg-purple-100 text-purple-700" :
                        c.role === "admin" ? "bg-blue-100 text-blue-700" :
                        c.role === "gestor" ? "bg-emerald-100 text-emerald-700" :
                        c.role === "mensajero" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {c.role || "user"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{c.phone ?? "—"}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("es-CU")}</td>
                  <td className="py-3 px-4 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openCustomer(c)}><Eye className="w-4 h-4" /> Ver</Button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Aún no hay clientes registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.full_name ?? viewing?.username}</DialogTitle>
            <DialogDescription>@{viewing?.username} · {viewing?.phone ?? "Sin teléfono"}</DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="card-elevated p-4">
                  <ShoppingBag className="w-5 h-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="font-display text-2xl font-bold">{history.length}</p>
                </div>
                <div className="card-elevated p-4">
                  <p className="text-xs text-muted-foreground">Total gastado</p>
                  <p className="font-display text-2xl font-bold text-primary">{formatPrice(totalSpentUSD)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Historial de compras</h3>
                  {history.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /> Borrar historial</Button>
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
                  <p className="text-sm text-muted-foreground">Sin pedidos.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {history.map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-xl p-3">
                        <div>
                          <p className="font-semibold">
                            {(o as any).payment_currency === "CUP" ? formatCUP(Number(o.total)) : formatPrice(Number(o.total))}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("es-CU")}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize">{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-elevated p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2 mb-2">
                  <UserCog className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Asignar Rol</h3>
                </div>
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
              </div>

              {viewing.role === "mensajero" && (
                <div className="card-elevated p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2 mb-2">
                    <Map className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Configuración de Mensajero</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                <Button variant="destructive" className="w-full">Eliminar Cliente</Button>
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, Trash2, Shield, ShoppingBag } from "lucide-react";

interface Customer {
  id: string;
  full_name: string | null;
  username: string;
  phone: string | null;
  created_at: string;
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

  const load = async () => {
    const { data } = await supabase.from("profiles").select("id,full_name,username,phone,created_at").order("created_at", { ascending: false });
    setCustomers((data ?? []) as any);
  };

  useEffect(() => { load(); }, []);

  const openCustomer = async (c: Customer) => {
    setViewing(c);
    const [{ data: orders }, { data: p }] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at,items").eq("user_id", c.id).order("created_at", { ascending: false }),
      supabase.from("admin_permissions").select("*").eq("user_id", c.id).maybeSingle(),
    ]);
    setHistory((orders ?? []) as any);
    setPerms(p);
  };

  const totalSpent = history.reduce((s, o) => s + Number(o.total ?? 0), 0);

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
      await supabase.from("user_roles").insert({ user_id: viewing.id, role: "admin" as any });
      const insertPayload: any = { user_id: viewing.id, [key]: value };
      const { data } = await supabase.from("admin_permissions").insert(insertPayload).select().single();
      setPerms(data);
    } else {
      const updatePayload: any = { [key]: value };
      const { data } = await supabase.from("admin_permissions").update(updatePayload).eq("user_id", viewing.id).select().single();
      setPerms(data);
    }
    toast.success("Permisos actualizados");
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
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Registrado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-3 px-4 font-semibold">{c.full_name ?? "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">@{c.username}</td>
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
                  <p className="font-display text-2xl font-bold text-primary">{formatPrice(totalSpent)}</p>
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
                          <p className="font-semibold">{formatPrice(Number(o.total))}</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("es-CU")}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize">{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {permissions.can_manage_admins && (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

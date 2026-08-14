import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCUP } from "@/lib/format";
import { MapPin, Plus, Trash2, CheckCircle, XCircle, Store, Wallet, User, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AdminMessenger() {
  const [salePoints, setSalePoints] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [newPoint, setNewPoint] = useState({ name: "", address: "", lat: 23.1136, lng: -82.3666 });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [{ data: points }, { data: requests }] = await Promise.all([
      supabase.from("sale_points").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_requests").select("*, profiles:user_id(full_name, username)").order("created_at", { ascending: false })
    ]);
    setSalePoints(points ?? []);
    setPaymentRequests(requests ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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

  return (
    <div className="space-y-8">
      {/* Sale Points Management */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="p-6 rounded-3xl border-border/50 shadow-soft">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-primary" /> Nuevo Punto de Venta
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nombre del Local</Label>
                <Input value={newPoint.name} onChange={e => setNewPoint({...newPoint, name: e.target.value})} placeholder="Ej: Almacén Central" />
              </div>
              <div className="space-y-1">
                <Label>Dirección</Label>
                <Input value={newPoint.address} onChange={e => setNewPoint({...newPoint, address: e.target.value})} placeholder="Ej: Calle 10 #5..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Latitud</Label>
                  <Input type="number" value={newPoint.lat} onChange={e => setNewPoint({...newPoint, lat: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label>Longitud</Label>
                  <Input type="number" value={newPoint.lng} onChange={e => setNewPoint({...newPoint, lng: Number(e.target.value)})} />
                </div>
              </div>
              <Button onClick={addPoint} className="w-full mt-4 rounded-xl">Añadir Punto</Button>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="p-6 rounded-3xl border-border/50 shadow-soft h-full">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-6">
              <Store className="w-5 h-5 text-primary" /> Puntos de Venta Activos
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {salePoints.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-secondary/30 border border-border/50 flex items-start justify-between group">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.address}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deletePoint(p.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {salePoints.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground italic border-2 border-dashed border-border rounded-2xl">
                  No hay puntos de venta registrados.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Payment Requests */}
      <Card className="p-6 rounded-3xl border-border/50 shadow-soft">
        <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-6">
          <Wallet className="w-5 h-5 text-primary" /> Solicitudes de Pago de Gestores
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-xs font-bold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Gestor</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paymentRequests.map(r => (
                <tr key={r.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{r.profiles?.full_name || r.profiles?.username}</p>
                        <p className="text-[10px] text-muted-foreground">@{r.profiles?.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-primary">{formatCUP(r.amount)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("es-CU")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={
                      r.status === 'paid' ? 'hero' : 
                      r.status === 'pending' ? 'outline' : 
                      r.status === 'approved' ? 'hero' : 'destructive'
                    } className="text-[10px] uppercase font-bold px-2 py-0.5">
                      {r.status === 'pending' ? 'Pendiente' : 
                       r.status === 'paid' ? 'Pagado' : 
                       r.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => updateRequestStatus(r.id, 'approved')}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2 text-destructive hover:bg-destructive/10" onClick={() => updateRequestStatus(r.id, 'rejected')}>
                          <XCircle className="w-4 h-4 mr-1" /> Rechazar
                        </Button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <Button size="sm" variant="hero" className="h-8 px-2" onClick={() => updateRequestStatus(r.id, 'paid')}>
                        Marcar como Pagado
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {paymentRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground italic">
                    No hay solicitudes de pago pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

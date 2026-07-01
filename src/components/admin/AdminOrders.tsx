import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ExternalLink, MapPin, MessageCircle, Trash2, Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, formatCUP } from "@/lib/format";
import { Order, OrderStatus, OrderItem } from "@/types";
import { useAdminOrders } from "@/hooks/admin/use-admin-orders";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const parseOrderItems = (items: Order["items"]): (OrderItem & { currency?: string; displayPriceUSD?: number; displayPriceCUP?: number })[] => {
  if (!Array.isArray(items)) return [];
  return items.flatMap((it) => {
    if (!isRecord(it)) return [];
    const name = typeof it.name === "string" ? it.name : "";
    const quantity = Number(it.quantity);
    const price = Number(it.price);
    const currency = typeof it.currency === "string" ? it.currency : undefined;
    const displayPriceUSD = typeof it.displayPriceUSD === "number" ? it.displayPriceUSD : undefined;
    const displayPriceCUP = typeof it.displayPriceCUP === "number" ? it.displayPriceCUP : undefined;
    
    if (!name || !Number.isFinite(quantity) || !Number.isFinite(price)) return [];
    return [{ name, quantity, price, currency, displayPriceUSD, displayPriceCUP }];
  });
};

const STATUSES = [
  { v: "pending", l: "Pendiente", c: "bg-warning/20 text-warning" },
  { v: "confirmed", l: "Confirmado", c: "bg-primary/20 text-primary" },
  { v: "preparing", l: "Preparando", c: "bg-accent/20 text-accent" },
  { v: "shipped", l: "Enviado", c: "bg-primary/20 text-primary" },
  { v: "delivered", l: "Entregado", c: "bg-success/20 text-success" },
  { v: "cancelled", l: "Cancelado", c: "bg-destructive/20 text-destructive" },
] satisfies Array<{ v: OrderStatus; l: string; c: string }>;

export function AdminOrders() {
  const { orders, loading, updateStatus, deleteOrder, deleteManyOrders, refresh: load } = useAdminOrders();
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<Order | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [courier, setCourier] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const removeOne = async (id: string) => {
    await deleteOrder(id);
  };

  const removeSelected = async () => {
    if (selected.size === 0) return;
    const ok = await deleteManyOrders(Array.from(selected));
    if (ok) setSelected(new Set());
  };

  const openView = (o: Order) => {
    setViewing(o);
    setDeliveryFee(Number(o.delivery_fee ?? 0));
    setCourier(o.courier_name ?? "");
    setAdminNotes(o.admin_notes ?? "");
  };

  const saveOrderDetails = async () => {
    if (!viewing) return;
    const newTotal = Number(viewing.subtotal) + Number(deliveryFee);
    const { error } = await supabase.from("orders").update({
      delivery_fee: deliveryFee,
      total: newTotal,
      courier_name: courier.trim() || null,
      admin_notes: adminNotes.trim() || null,
    }).eq("id", viewing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Detalles guardados");
    load();
    setViewing({ ...viewing, delivery_fee: deliveryFee, total: newTotal, courier_name: courier, admin_notes: adminNotes });
  };

  const sendReceipt = async () => {
    if (!viewing) return;
    const currency = (viewing as any).payment_currency || "USD";
    const items = parseOrderItems(viewing.items)
      .map((it) => {
        const itemPrice = currency === "USD" ? (it.displayPriceUSD || it.price) : (it.displayPriceCUP || it.price);
        return `• ${it.name} x${it.quantity} — ${currency === "USD" ? formatPrice(itemPrice * it.quantity) : formatCUP(itemPrice * it.quantity)}`;
      })
      .join("\n");
    
    const paymentCurrency = (viewing as any).payment_currency || "USD";
    const subtotalFormatted = paymentCurrency === "USD"
      ? `USD ${formatPrice(Number(viewing.subtotal))}`
      : `CUP ${formatCUP(Number(viewing.total_cup ?? viewing.subtotal))}`;
    const shippingFormatted = viewing.delivery_method === "delivery" && Number(deliveryFee) > 0
      ? `Mensajería en CUP: ${formatCUP(Number(deliveryFee))}`
      : viewing.delivery_method === "pickup"
        ? "Recogida en local"
        : "Sin mensajería";
    const totalFormatted = paymentCurrency === "USD"
      ? `USD ${formatPrice(Number(viewing.subtotal) + Number(deliveryFee))}`
      : `CUP ${formatCUP(Number(viewing.total_cup ?? Number(viewing.subtotal) + Number(deliveryFee)))}`;

    const msg = `🛍️ *VALE DE PEDIDO — NeoCharge*\n\n` +
      `Hola ${viewing.customer_name}, te confirmamos tu pedido:\n\n` +
      `${items}\n\n` +
      `Producto: ${subtotalFormatted}\n` +
      `${shippingFormatted}\n` +
      `*TOTAL ${paymentCurrency === "USD" ? "EN USD" : "EN CUP"}: ${totalFormatted}*\n\n` +
      (viewing.delivery_method === "delivery" ? `📍 Entrega: ${viewing.customer_address}\n` : `🏪 Recoger en: ${viewing.pickup_location}\n`) +
      (courier ? `🛵 Mensajero: ${courier}\n` : "") +
      `\nGracias por tu compra. ¡Te avisamos cuando salga en camino!`;
    const phone = viewing.customer_phone.replace(/\D/g, "");
    const link = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(link, "_blank");
    await supabase.from("orders").update({ receipt_sent_at: new Date().toISOString() }).eq("id", viewing.id);
    toast.success("Vale enviado por WhatsApp");
    load();
  };

  const statusBadge = (s: OrderStatus) => {
    const st = STATUSES.find((x) => x.v === s);
    return <Badge className={st?.c ?? "bg-secondary"}>{st?.l ?? s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({orders.length})</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4" /> Eliminar {selected.size}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar {selected.size} pedidos?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={removeSelected} className="bg-destructive">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="card-elevated p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4 w-10">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={(v) => {
                      const checked = v === true;
                      setSelected(checked ? new Set(filtered.map((o) => o.id)) : new Set());
                    }}
                  />
                </th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Entrega</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                  <td className="py-3 px-4">
                    <Checkbox
                      checked={selected.has(o.id)}
                      onCheckedChange={(v) => {
                        const n = new Set(selected);
                        if (v === true) n.add(o.id);
                        else n.delete(o.id);
                        setSelected(n);
                      }}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-xs">
                      {o.delivery_method === "delivery" ? "🚚 Domicilio" : "🏪 Recoger"}
                      {o.location_link && <a href={o.location_link} target="_blank" rel="noreferrer" className="text-primary"><MapPin className="w-3 h-3" /></a>}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-primary">
                    {(o as any).payment_currency === "CUP" ? formatCUP(Number(o.total)) : formatPrice(Number(o.total))}
                  </td>
                  <td className="py-3 px-4">{statusBadge(o.status)}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("es-CU")}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openView(o)}><Eye className="w-4 h-4" /></Button>
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v as OrderStatus)}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No hay pedidos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido de {viewing?.customer_name}</DialogTitle>
            <DialogDescription>{viewing && new Date(viewing.created_at).toLocaleString("es-CU")}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Cliente</p>
                  <p className="font-semibold">{viewing.customer_name}</p>
                  <a href={`https://wa.me/${viewing.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline inline-flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {viewing.customer_phone}
                  </a>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Entrega</p>
                  <p className="font-semibold">{viewing.delivery_method === "delivery" ? "🚚 Domicilio" : "🏪 Recoger en local"}</p>
                  <p className="text-xs">{viewing.delivery_method === "delivery" ? viewing.customer_address : viewing.pickup_location}</p>
                </div>
              </div>

              {viewing.location_link && (
                <a href={viewing.location_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 hover:bg-primary/10">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Ver ubicación exacta del cliente en mapa</span>
                  <ExternalLink className="w-3 h-3 text-primary ml-auto" />
                </a>
              )}

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase">Productos</p>
                  <div className="space-y-2">
                    {parseOrderItems(viewing.items).map((it, i) => {
                      const currency = (viewing as any).payment_currency || "USD";
                      const itemPrice = currency === "USD" ? (it.displayPriceUSD || it.price) : (it.displayPriceCUP || it.price);
                      return (
                        <div key={i} className="flex items-center justify-between bg-muted/30 rounded-xl p-3 text-sm">
                          <span>{it.name} <span className="text-muted-foreground">×{it.quantity}</span></span>
                          <span className="font-bold">
                            {currency === "USD" ? formatPrice(itemPrice * it.quantity) : formatCUP(itemPrice * it.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Costo de envío</Label>
                  <Input type="number" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Mensajero asignado</Label>
                  <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Nombre del mensajero" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas internas</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="min-h-[60px]" />
              </div>

              <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-4 space-y-1">
                {(() => {
                  const currency = (viewing as any).payment_currency || "USD";
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Producto</span>
                        <span>USD {formatPrice(Number(viewing.subtotal))} / CUP {formatCUP(Number(viewing.total_cup ?? viewing.subtotal))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Envío</span>
                        <span>USD {formatPrice(Number(deliveryFee))} / CUP {formatCUP(Number((viewing as any).shipping_cup ?? deliveryFee))}</span>
                      </div>
                      <div className="flex justify-between font-display font-bold text-lg pt-2 border-t border-border">
                        <span>TOTAL</span>
                        <span className="text-primary">
                          USD {formatPrice(Number(viewing.subtotal) + Number(deliveryFee))} / CUP {formatCUP(Number(viewing.total_cup ?? Number(viewing.subtotal) + Number(deliveryFee))) }
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {viewing.receipt_sent_at && (
                <p className="text-xs text-success">✓ Vale enviado el {new Date(viewing.receipt_sent_at).toLocaleString("es-CU")}</p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive mr-auto"><Trash2 className="w-4 h-4" /> Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if (viewing) { removeOne(viewing.id); setViewing(null); } }} className="bg-destructive">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={saveOrderDetails}>Guardar cambios</Button>
            <Button variant="hero" onClick={sendReceipt}><Send className="w-4 h-4" /> Enviar vale por WhatsApp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

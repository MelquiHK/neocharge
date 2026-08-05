import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminSales } from "@/hooks/admin/use-admin-sales";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatPrice, formatCUP } from "@/lib/format";
import { Trash2 } from "lucide-react";

export function AdminSales() {
  const { user, permissions } = useAuth();
  const { sales, loading, createSale, markPaid, removeSale, load } = useAdminSales();
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState<number | string>(0);
  const [currency, setCurrency] = useState("USD");
  const [sellerName, setSellerName] = useState("");

  useEffect(() => {
    if (user) setSellerName((user.user_metadata as any)?.full_name ?? user.email ?? "");
  }, [user]);

  const submit = async () => {
    try {
      const payload = {
        product_id: productId,
        product_name: productName,
        seller_user_id: user?.id ?? null,
        seller_name: sellerName,
        price: Number(price || 0),
        currency,
        amount_to_receive: Number(price || 0),
      };
      await createSale(payload);
      toast.success("Venta registrada");
      setProductId(null); setProductName(""); setPrice(0);
    } catch (e: any) {
      toast.error(e.message || "Error creando venta");
    }
  };

  const totals = useMemo(() => {
    const totalUSD = sales.filter(s => s.currency === "USD").reduce((a,b) => a + Number(b.price || 0), 0);
    const totalCUP = sales.filter(s => s.currency === "CUP").reduce((a,b) => a + Number(b.price || 0), 0);
    return { totalUSD, totalCUP };
  }, [sales]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Ventas de gestores</h2>
        <div className="text-sm text-muted-foreground">Total USD: {formatPrice(totals.totalUSD)} — Total CUP: {formatCUP(totals.totalCUP)}</div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-2"><Label>Producto</Label><Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nombre o SKU" /></div>
        <div className="space-y-2"><Label>Precio</Label><Input type="number" step="0.01" value={price as any} onChange={(e) => setPrice(e.target.value)} /></div>
        <div className="space-y-2"><Label>Moneda</Label><Select value={currency} onValueChange={(v) => setCurrency(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="CUP">CUP</SelectItem></SelectContent></Select></div>
      </div>
      <div className="flex items-center gap-3">
        <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Nombre del gestor" />
        <Button variant="hero" onClick={submit}>Registrar venta</Button>
      </div>

      <div className="space-y-4">
        {loading ? <div>Cargando...</div> : (
          <div className="grid gap-2">
            {sales.map((s) => (
              <div key={s.id} className="p-3 rounded-lg border flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.product_name ?? "(sin nombre)"}</div>
                  <div className="text-sm text-muted-foreground">{s.seller_name} • {new Date(s.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{s.currency === "USD" ? formatPrice(Number(s.price)) : formatCUP(Number(s.price))}</div>
                  {!s.is_paid ? <Button size="sm" onClick={async () => { try { await markPaid(s.id); toast.success("Marcado como pagado"); } catch (e:any){ toast.error(e.message); } }}>Marcar pagado</Button> : <div className="text-sm text-muted-foreground">Pagado</div>}
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => { if (confirm('Eliminar venta?')) { try { await removeSale(s.id); toast.success('Eliminado'); } catch (e:any){ toast.error(e.message); } } }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

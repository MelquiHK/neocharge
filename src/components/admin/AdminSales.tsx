import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminSales } from "@/hooks/admin/use-admin-sales";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatPrice, formatCUP } from "@/lib/format";
import { BadgeCheck, DollarSign, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProductOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  price_cup: number | null;
}

export function AdminSales() {
  const { user, permissions } = useAuth();
  const { sales, loading, createSale, markPaid, removeSale } = useAdminSales();
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState<number | string>(0);
  const [currency, setCurrency] = useState("USD");
  const [sellerName, setSellerName] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [filterSeller, setFilterSeller] = useState("all");

  useEffect(() => {
    if (user) setSellerName((user.user_metadata as any)?.full_name ?? user.email ?? "");
  }, [user]);

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, currency, price_cup")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error) setProductOptions((data ?? []) as ProductOption[]);
    };

    void loadProducts();
  }, []);

  const submit = async () => {
    if (!productName.trim()) {
      toast.error("Selecciona un producto antes de registrar la venta.");
      return;
    }

    try {
      const payload = {
        product_id: productId,
        product_name: productName,
        seller_user_id: user?.id ?? null,
        seller_name: sellerName || user?.email || "Gestor",
        price: Number(price || 0),
        currency,
        amount_to_receive: Number(price || 0),
        notes: `Venta registrada por ${sellerName || user?.email || "Gestor"}`,
      };
      await createSale(payload);
      toast.success("Venta registrada");
      setProductId(null);
      setProductName("");
      setPrice(0);
      setCurrency("USD");
    } catch (e: any) {
      toast.error(e.message || "Error creando venta");
    }
  };

  const filteredSales = useMemo(() => {
    const visibleSales = permissions.is_owner ? sales : sales.filter((s) => s.seller_user_id === user?.id || s.seller_name === sellerName || s.seller_name === user?.email);

    if (filterSeller === "all") return visibleSales;
    return visibleSales.filter((s) => (s.seller_user_id ?? s.seller_name) === filterSeller);
  }, [filterSeller, permissions.is_owner, sales, sellerName, user?.email, user?.id]);

  const totals = useMemo(() => {
    const totalUSD = filteredSales.filter((s) => s.currency === "USD").reduce((a, b) => a + Number(b.price || 0), 0);
    const totalCUP = filteredSales.filter((s) => s.currency === "CUP").reduce((a, b) => a + Number(b.price || 0), 0);
    return { totalUSD, totalCUP };
  }, [filteredSales]);

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach((s) => {
      const key = s.seller_user_id ?? s.seller_name ?? "unknown";
      if (!map.has(key)) map.set(key, s.seller_name || "Gestor");
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [sales]);

  const isOwner = permissions.is_owner;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">{isOwner ? "Ventas del negocio" : "Mi panel de ventas"}</h2>
          <p className="text-sm text-muted-foreground">
            {isOwner ? "Control total de ventas y comisiones del negocio." : "Registra tus ventas y revisa tu desempeño personal."}
          </p>
        </div>
        <div className="text-sm text-muted-foreground rounded-full border border-border bg-secondary/50 px-3 py-1.5">
          Total USD: {formatPrice(totals.totalUSD)} — Total CUP: {formatCUP(totals.totalCUP)}
        </div>
      </header>

      {!isOwner && (
        <div className="rounded-3xl border border-border bg-gradient-to-r from-primary/5 to-blue-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" /> Panel de gestor
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Tus ventas solo son visibles para ti y para el administrador principal.</p>
        </div>
      )}

      {!isOwner && (
        <div className="grid gap-4 rounded-3xl border border-border bg-white/80 p-5 shadow-soft">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select
                value={productId ?? undefined}
                onValueChange={(value) => {
                  const selected = productOptions.find((p) => p.id === value);
                  if (!selected) return;
                  setProductId(value);
                  setProductName(selected.name);
                  setCurrency(selected.currency || "USD");
                  setPrice(selected.currency === "CUP" ? (selected.price_cup ?? selected.price) : selected.price);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} — {product.currency === "CUP" ? `${product.price_cup ?? product.price} CUP` : `${product.price} USD`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nombre del producto</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nombre o referencia del producto" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Precio</Label>
              <Input type="number" step="0.01" value={price as any} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CUP">CUP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gestor</Label>
              <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Nombre del gestor" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="hero" onClick={submit}>Registrar venta</Button>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="grid gap-4 rounded-3xl border border-border bg-secondary/40 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Label>Filtrar por gestor</Label>
              <Select value={filterSeller} onValueChange={setFilterSeller}>
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los gestores</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.key} value={seller.key}>{seller.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              {filteredSales.length} ventas visibles
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">Cargando ventas...</div>
        ) : filteredSales.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
            {isOwner ? "Aún no hay ventas registradas en el panel principal." : "Todavía no has registrado ventas para este gestor."}
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div key={sale.id} className="flex flex-col gap-3 rounded-3xl border border-border bg-white/80 p-4 shadow-soft md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{sale.product_name ?? "Producto sin nombre"}</p>
                  {sale.is_paid && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {sale.seller_name || "Gestor sin nombre"} • {new Date(sale.created_at).toLocaleString("es-ES")}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <div className="font-semibold text-lg">{sale.currency === "USD" ? formatPrice(Number(sale.price)) : formatCUP(Number(sale.price))}</div>
                {!sale.is_paid && (
                  <Button size="sm" onClick={async () => { try { await markPaid(sale.id); toast.success("Venta marcada como pagada"); } catch (e: any) { toast.error(e.message || "No se pudo actualizar"); } }}>
                    Marcar pagada
                  </Button>
                )}
                {(isOwner || sale.seller_user_id === user?.id) && (
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => {
                    if (!confirm("¿Eliminar esta venta?")) return;
                    try { await removeSale(sale.id); toast.success("Venta eliminada"); } catch (e: any) { toast.error(e.message || "No se pudo eliminar"); }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

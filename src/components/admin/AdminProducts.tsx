import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Image as ImageIcon, X, Star } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface Category { id: string; name: string; }
interface Location { id: string; name: string; }

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  specifications: string | null;
  price: number;
  cost_price: number | null;
  compare_price: number | null;
  currency: string;
  price_cup: number | null;
  category_id: string | null;
  images: string[];
  main_image_index: number;
  stock: number;
  low_stock_threshold: number | null;
  is_active: boolean;
  is_featured: boolean;
  warranty_type: string | null;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const empty: Partial<Product> = {
  name: "", slug: "", description: "", specifications: "", price: 0, cost_price: 0,
  compare_price: null, currency: "USD", price_cup: null, category_id: null, images: [],
  main_image_index: 0, stock: 0, low_stock_threshold: 5, is_active: true, is_featured: false,
  warranty_type: "electronics",
};

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productLocs, setProductLocs] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: p }, { data: c }, { data: l }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("sort_order"),
      supabase.from("store_locations").select("id,name").eq("is_active", true).order("sort_order"),
    ]);
    setProducts((p ?? []) as any);
    setCategories(c ?? []);
    setLocations(l ?? []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({ ...empty });
    setProductLocs({});
    setDialogOpen(true);
  };

  const openEdit = async (p: Product) => {
    setEditing({ ...p });
    const { data } = await supabase.from("product_locations").select("location_id,stock").eq("product_id", p.id);
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { map[r.location_id] = r.stock; });
    setProductLocs(map);
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Error al subir imagen: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    setEditing((prev) => prev ? { ...prev, images: [...(prev.images ?? []), publicUrl] } : prev);
    setUploading(false);
    toast.success("Imagen subida");
  };

  const removeImage = (i: number) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const imgs = (prev.images ?? []).filter((_, idx) => idx !== i);
      const main = (prev.main_image_index ?? 0) >= imgs.length ? 0 : prev.main_image_index;
      return { ...prev, images: imgs, main_image_index: main };
    });
  };

  const saveProduct = async () => {
    if (!editing?.name?.trim()) { toast.error("Nombre obligatorio"); return; }
    const slug = editing.slug?.trim() || slugify(editing.name);
    const payload = {
      name: editing.name.trim(),
      slug,
      description: editing.description?.trim() || null,
      specifications: editing.specifications?.trim() || null,
      price: Number(editing.price ?? 0),
      cost_price: Number(editing.cost_price ?? 0),
      compare_price: editing.compare_price ? Number(editing.compare_price) : null,
      currency: editing.currency ?? "USD",
      price_cup: editing.price_cup ? Number(editing.price_cup) : null,
      category_id: editing.category_id || null,
      images: editing.images ?? [],
      main_image_index: editing.main_image_index ?? 0,
      stock: Number(editing.stock ?? 0),
      low_stock_threshold: Number(editing.low_stock_threshold ?? 5),
      is_active: editing.is_active ?? true,
      is_featured: editing.is_featured ?? false,
      warranty_type: editing.warranty_type ?? "electronics",
    };

    let productId = editing.id;
    if (editing.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Error: " + error.message); return; }
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast.error("Error: " + error.message); return; }
      productId = data.id;
    }

    // Sync product_locations
    if (productId) {
      await supabase.from("product_locations").delete().eq("product_id", productId);
      const rows = Object.entries(productLocs)
        .filter(([_, s]) => Number(s) >= 0)
        .map(([location_id, stock]) => ({ product_id: productId!, location_id, stock: Number(stock) }));
      if (rows.length > 0) await supabase.from("product_locations").insert(rows);
    }

    toast.success("Producto guardado");
    setDialogOpen(false);
    load();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Producto eliminado");
    load();
  };

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={openNew} variant="hero"><Plus className="w-4 h-4" /> Nuevo producto</Button>
      </div>

      <div className="card-elevated p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Precio</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const img = p.images?.[p.main_image_index ?? 0];
                const isLow = (p.stock ?? 0) <= (p.low_stock_threshold ?? 5);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                          {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold">{formatPrice(Number(p.price))} {p.currency}</td>
                    <td className="py-3 px-4">
                      <span className={isLow ? "text-destructive font-semibold" : ""}>{p.stock}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {p.is_active ? <Badge variant="default" className="bg-success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                        {p.is_featured && <Badge variant="default" className="bg-accent text-accent-foreground"><Star className="w-3 h-3" /></Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                              <AlertDialogDescription>Esto borrará "{p.name}" definitivamente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteProduct(p.id)} className="bg-destructive">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No hay productos. Crea el primero con "Nuevo producto".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>Completa la información del producto.</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label>Especificaciones técnicas</Label>
                <Textarea value={editing.specifications ?? ""} onChange={(e) => setEditing({ ...editing, specifications: e.target.value })} className="min-h-[80px]" placeholder="Voltaje: 72V&#10;Amperaje: 5A&#10;..." />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={editing.currency ?? "USD"} onValueChange={(v) => setEditing({ ...editing, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CUP">CUP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Precio venta *</Label>
                  <Input type="number" step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Precio costo</Label>
                  <Input type="number" step="0.01" value={editing.cost_price ?? 0} onChange={(e) => setEditing({ ...editing, cost_price: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Precio anterior (oferta)</Label>
                  <Input type="number" step="0.01" value={editing.compare_price ?? ""} onChange={(e) => setEditing({ ...editing, compare_price: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <Label>Stock total</Label>
                  <Input type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Alerta stock bajo</Label>
                  <Input type="number" value={editing.low_stock_threshold ?? 5} onChange={(e) => setEditing({ ...editing, low_stock_threshold: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={editing.category_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, category_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de garantía</Label>
                  <Select value={editing.warranty_type ?? "electronics"} onValueChange={(v) => setEditing({ ...editing, warranty_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="charger">Cargador (24h prueba + cambio)</SelectItem>
                      <SelectItem value="electronics">Electrónica (prueba en local, sin devolución)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <Label>Imágenes</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(editing.images ?? []).map((url, i) => (
                    <div key={i} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${(editing.main_image_index ?? 0) === i ? "border-primary" : "border-border"}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="w-3 h-3" /></button>
                      <button type="button" onClick={() => setEditing({ ...editing, main_image_index: i })} className="absolute bottom-1 left-1 right-1 text-[10px] bg-background/80 rounded px-1 py-0.5">
                        {(editing.main_image_index ?? 0) === i ? "Principal ⭐" : "Hacer principal"}
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary text-muted-foreground hover:text-primary transition-colors">
                    {uploading ? "Subiendo..." : <><ImageIcon className="w-6 h-6" /><span className="text-xs">Subir</span></>}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                  </label>
                </div>
              </div>

              {/* Stock por local */}
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label>Stock por local</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {locations.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 p-2 rounded-xl border border-border">
                        <span className="text-sm flex-1 truncate">{l.name}</span>
                        <Input
                          type="number"
                          value={productLocs[l.id] ?? 0}
                          onChange={(e) => setProductLocs({ ...productLocs, [l.id]: Number(e.target.value) })}
                          className="w-20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> Activo</label>
                <label className="flex items-center gap-2"><Switch checked={!!editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} /> Destacado</label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={saveProduct}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

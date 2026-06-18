import { useEffect, useMemo, useState } from "react";
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
import { Copy, Download, Plus, Pencil, Trash2, Image as ImageIcon, X, Star, Sparkles, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Product, Category, StoreLocation } from "@/types";
import { useAdminProducts } from "@/hooks/admin/use-admin-products";
import { productSchema } from "@/lib/schemas";

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
  const { products, categories, locations, loading, refresh, deleteProduct } = useAdminProducts();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productLocs, setProductLocs] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "lowStock" | "featured">("all");
  const [sortBy, setSortBy] = useState<"newest" | "name" | "price" | "stock">("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("none");

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

  const isLowStock = (p: Product) => Number(p.stock ?? 0) <= Number(p.low_stock_threshold ?? 5);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => (p.name ?? "").toLowerCase().includes(q) || (p.slug ?? "").toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => (p.category_id ?? "none") === categoryFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => {
        if (statusFilter === "active") return !!p.is_active;
        if (statusFilter === "inactive") return !p.is_active;
        if (statusFilter === "featured") return !!p.is_featured;
        if (statusFilter === "lowStock") return isLowStock(p);
        return true;
      });
    }
    list.sort((a, b) => {
      if (sortBy === "name") return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortBy === "price") return Number(b.price ?? 0) - Number(a.price ?? 0);
      if (sortBy === "stock") return Number(b.stock ?? 0) - Number(a.stock ?? 0);
      // newest (fallback): created_at may not be present in type, so keep stable by name+id
      return String(b.id).localeCompare(String(a.id));
    });
    return list;
  }, [products, search, categoryFilter, statusFilter, sortBy]);

  const allSelectedOnPage = filtered.length > 0 && selected.size === filtered.length;

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(filtered.map((p) => p.id)) : new Set());
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const patchOne = async (id: string, patch: Partial<Product>) => {
    const { error } = await supabase.from("products").update(patch as any).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const bulkPatch = async (patch: Partial<Product>) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const { error } = await supabase.from("products").update(patch as any).in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Actualizados ${ids.length} productos`);
    setSelected(new Set());
    refresh();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Eliminados ${ids.length} productos`);
    setSelected(new Set());
    refresh();
  };

  const duplicateProduct = async (p: Product) => {
    const base = {
      ...p,
      id: undefined,
      name: `${p.name} (copia)`,
      slug: `${p.slug}-${Math.random().toString(36).slice(2, 6)}`,
      is_featured: false,
      is_active: false,
    } as any;
    delete base.created_at;
    delete base.updated_at;
    const { error } = await supabase.from("products").insert(base);
    if (error) return toast.error(error.message);
    toast.success("Producto duplicado (queda inactivo)");
    refresh();
  };

  const exportCsv = () => {
    const rows = filtered.map((p) => ({
      id: p.id,
      name: p.name ?? "",
      slug: p.slug ?? "",
      price: Number(p.price ?? 0),
      currency: p.currency ?? "USD",
      stock: Number(p.stock ?? 0),
      category_id: p.category_id ?? "",
      is_active: !!p.is_active,
      is_featured: !!p.is_featured,
    }));
    const headers = Object.keys(rows[0] ?? { id: "" });
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neocharge-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    if (!editing) return;
    
    const slug = editing.slug?.trim() || slugify(editing.name ?? "");
    const dataToValidate = {
      ...editing,
      slug,
      price: Number(editing.price ?? 0),
      cost_price: editing.cost_price ? Number(editing.cost_price) : 0,
      compare_price: editing.compare_price ? Number(editing.compare_price) : null,
      stock: Number(editing.stock ?? 0),
      low_stock_threshold: Number(editing.low_stock_threshold ?? 5),
    };

    const result = productSchema.safeParse(dataToValidate);
    
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(`${firstError.path.join(".")}: ${firstError.message}`);
      return;
    }

    const payload = result.data;

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
      const rows = Object.entries(productLocs)
        .filter(([_, stock]) => stock !== undefined && stock !== null && !Number.isNaN(Number(stock)))
        .map(([location_id, stock]) => ({ product_id: productId!, location_id, stock: Number(stock) }));

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("product_locations")
          .upsert(rows, { onConflict: ["product_id", "location_id"] });
        if (upsertError) {
          console.error("Error upserting product locations:", upsertError);
          toast.error("No se pudo guardar la disponibilidad en tiendas.");
          return;
        }
      }
    }

    toast.success("Producto guardado");
    setDialogOpen(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 justify-between">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          <div className="space-y-1">
            <Label>Buscar</Label>
            <Input placeholder="Nombre o slug..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="featured">Destacados</SelectItem>
                <SelectItem value="lowStock">Stock bajo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Orden</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="price">Precio</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={exportCsv}><Download className="w-4 h-4" /> Exportar CSV</Button>
          <Button onClick={openNew} variant="hero"><Plus className="w-4 h-4" /> Nuevo</Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="card-elevated p-4 flex flex-wrap items-center gap-2 justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{selected.size}</span> seleccionados
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => bulkPatch({ is_active: true })}>Activar</Button>
            <Button size="sm" variant="secondary" onClick={() => bulkPatch({ is_active: false })}>Desactivar</Button>
            <Button size="sm" variant="secondary" onClick={() => bulkPatch({ is_featured: true })}><Sparkles className="w-4 h-4" /> Destacar</Button>
            <Button size="sm" variant="secondary" onClick={() => bulkPatch({ is_featured: false })}>Quitar destacado</Button>
            <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
              <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Mover a categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bulkPatch({ category_id: bulkCategoryId === "none" ? null : bulkCategoryId })}
            >
              Mover
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive"><Trash2 className="w-4 h-4" /> Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar {selected.size} productos?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDelete} className="bg-destructive">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <div className="card-elevated p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4 w-10">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center"
                    onClick={() => toggleSelectAll(!allSelectedOnPage)}
                    aria-label="Seleccionar todo"
                  >
                    {allSelectedOnPage ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
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
                const isLow = isLowStock(p);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center"
                        onClick={() => toggleSelectOne(p.id, !selected.has(p.id))}
                        aria-label="Seleccionar"
                      >
                        {selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
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
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={Number(p.stock ?? 0)}
                          onChange={async (e) => {
                            const v = Number(e.target.value);
                            await patchOne(p.id, { stock: v });
                            refresh();
                          }}
                          className={isLow ? "w-24 border-destructive" : "w-24"}
                        />
                        {isLow && <span className="text-xs text-destructive font-semibold">Bajo</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={!!p.is_active}
                            onCheckedChange={async (v) => {
                              const ok = await patchOne(p.id, { is_active: v });
                              if (ok) refresh();
                            }}
                          />
                          <span className={p.is_active ? "text-success font-semibold" : "text-muted-foreground"}>Activo</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={!!p.is_featured}
                            onCheckedChange={async (v) => {
                              const ok = await patchOne(p.id, { is_featured: v });
                              if (ok) refresh();
                            }}
                          />
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3" /> Destacado
                          </span>
                        </label>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => duplicateProduct(p)} title="Duplicar">
                          <Copy className="w-4 h-4" />
                        </Button>
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
                  <Label>Precio fijo en CUP (opcional)</Label>
                  <Input type="number" step="1" value={editing.price_cup ?? ""} onChange={(e) => setEditing({ ...editing, price_cup: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <Label>Extra CUP por cada USD (opcional)</Label>
                  <Input type="number" step="1" value={editing.extra_cup_per_usd ?? ""} onChange={(e) => setEditing({ ...editing, extra_cup_per_usd: e.target.value ? Number(e.target.value) : null })} />
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
                      <SelectItem value="no-warranty">Sin garantía</SelectItem>
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

              {/* Stock por local (Disponibilidad) */}
              {locations.length > 0 && (
                <div className="space-y-3 border rounded-xl p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30">
                  <div>
                    <Label className="text-base font-semibold flex items-center gap-2">
                      📍 Disponibilidad en Tiendas
                      <span className="text-xs font-normal text-muted-foreground">(Esto aparecerá en la página del producto)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Define cuántas unidades hay disponibles en cada tienda física</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {locations.map((l) => (
                      <div key={l.id} className="flex flex-col gap-2 p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-slate-900 dark:text-white">{l.name}</span>
                          <span className="text-xs text-muted-foreground">{l.location_type === 'physical' ? '🏪 Física' : '📦 Centro'}</span>
                        </div>
                        {l.address && <p className="text-xs text-muted-foreground">{l.address}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Stock:</label>
                          <Input
                            type="number"
                            min="0"
                            value={productLocs[l.id] ?? 0}
                            onChange={(e) => setProductLocs({ ...productLocs, [l.id]: Math.max(0, Number(e.target.value)) })}
                            className="w-24 text-center"
                          />
                          <span className="text-xs text-muted-foreground">unidades</span>
                        </div>
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

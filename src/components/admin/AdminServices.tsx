import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Wrench, FolderTree, Inbox } from "lucide-react";
import { toast } from "sonner";
import { useAdminServices } from "@/hooks/admin/use-admin-services";
import { serviceSchema, serviceCategorySchema } from "@/lib/schemas";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ICON_OPTIONS = ["Globe", "Code", "Wrench", "Wind", "Smartphone", "Cpu", "Settings", "Zap", "Monitor", "Hammer"];

const emptyService = {
  name: "", slug: "", short_description: "", description: "", price: null as number | null,
  price_label: "", currency: "USD", category_id: null as string | null, image_url: "",
  is_active: true, is_featured: false, sort_order: 0,
};

const emptyCategory = {
  name: "", slug: "", description: "", icon: "Wrench", sort_order: 0, is_active: true,
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
};

export function AdminServices() {
  const { services, categories, requests, loading, refresh, deleteService, deleteCategory, updateRequestStatus } = useAdminServices();
  const [svcDialog, setSvcDialog] = useState(false);
  const [catDialog, setCatDialog] = useState(false);
  const [editingSvc, setEditingSvc] = useState<any>(null);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const openNewService = () => {
    const maxOrder = services.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0);
    setEditingSvc({ ...emptyService, sort_order: maxOrder + 1 });
    setSvcDialog(true);
  };

  const openEditService = (s: any) => {
    setEditingSvc({ ...s });
    setSvcDialog(true);
  };

  const openNewCategory = () => {
    setEditingCat({ ...emptyCategory, sort_order: categories.length });
    setCatDialog(true);
  };

  const openEditCategory = (c: any) => {
    setEditingCat({ ...c });
    setCatDialog(true);
  };

  const moveService = async (id: string, dir: "up" | "down") => {
    const sorted = [...services].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex((s) => s.id === id);
    const otherIdx = dir === "up" ? idx - 1 : idx + 1;
    if (otherIdx < 0 || otherIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[otherIdx];
    await supabase.from("services").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("services").update({ sort_order: a.sort_order }).eq("id", b.id);
    refresh();
  };

  const moveCategory = async (id: string, dir: "up" | "down") => {
    const sorted = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex((c) => c.id === id);
    const otherIdx = dir === "up" ? idx - 1 : idx + 1;
    if (otherIdx < 0 || otherIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[otherIdx];
    await supabase.from("service_categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("service_categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    refresh();
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `services/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast.error("Error al subir imagen");
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    setEditingSvc((prev: any) => prev ? { ...prev, image_url: publicUrl } : prev);
    setUploading(false);
    toast.success("Imagen subida");
  };

  const saveService = async () => {
    if (!editingSvc) return;
    const payload = {
      ...editingSvc,
      slug: editingSvc.slug?.trim() || slugify(editingSvc.name ?? ""),
      price: editingSvc.price ? Number(editingSvc.price) : null,
      sort_order: Number(editingSvc.sort_order ?? 0),
      category_id: editingSvc.category_id || null,
      price_label: editingSvc.price_label || null,
    };
    delete payload.created_at;
    delete payload.updated_at;

    const result = serviceSchema.safeParse(payload);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (editingSvc.id) {
      const { error } = await supabase.from("services").update(result.data).eq("id", editingSvc.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("services").insert(result.data);
      if (error) return toast.error(error.message);
    }
    toast.success("Servicio guardado");
    setSvcDialog(false);
    refresh();
  };

  const saveCategory = async () => {
    if (!editingCat) return;
    const payload = {
      ...editingCat,
      slug: editingCat.slug?.trim() || slugify(editingCat.name ?? ""),
      sort_order: Number(editingCat.sort_order ?? 0),
    };
    delete payload.created_at;

    const result = serviceCategorySchema.safeParse(payload);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (editingCat.id) {
      const { error } = await supabase.from("service_categories").update(result.data).eq("id", editingCat.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("service_categories").insert(result.data);
      if (error) return toast.error(error.message);
    }
    toast.success("Categoría guardada");
    setCatDialog(false);
    refresh();
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Cargando servicios...</div>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="services">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="services" className="gap-2 rounded-xl"><Wrench className="w-4 h-4" /> Servicios</TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 rounded-xl"><FolderTree className="w-4 h-4" /> Categorías</TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 rounded-xl"><Inbox className="w-4 h-4" /> Solicitudes ({requests.filter(r => r.status === "pending").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button variant="hero" onClick={openNewService}><Plus className="w-4 h-4" /> Nuevo servicio</Button>
          </div>
          <div className="card-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-3 px-4 w-20">Orden</th>
                  <th className="py-3 px-4">Servicio</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Precio</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[...services].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((s) => {
                  const cat = categories.find((c) => c.id === s.category_id);
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold">#{s.sort_order ?? 0}</span>
                          <div className="flex gap-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveService(s.id, "up")}><ArrowUp className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveService(s.id, "down")}><ArrowDown className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{s.short_description}</p>
                      </td>
                      <td className="py-3 px-4">{cat?.name ?? "—"}</td>
                      <td className="py-3 px-4 font-bold">
                        {s.price_label || (s.price != null ? formatPrice(Number(s.price), s.currency) : "Consultar")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {s.is_active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}
                          {s.is_featured && <Badge>Destacado</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditService(s)}><Pencil className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                                <AlertDialogDescription>Se eliminará "{s.name}" permanentemente.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteService(s.id)} className="bg-destructive">Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {services.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No hay servicios. Crea el primero.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button variant="hero" onClick={openNewCategory}><Plus className="w-4 h-4" /> Nueva categoría</Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((c) => (
              <div key={c.id} className="card-elevated p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.slug}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveCategory(c.id, "up")}><ArrowUp className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveCategory(c.id, "down")}><ArrowDown className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEditCategory(c)}><Pencil className="w-3.5 h-3.5" /> Editar</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                        <AlertDialogDescription>Los servicios de esta categoría quedarán sin categoría.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCategory(c.id)} className="bg-destructive">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <div className="card-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Servicio</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-3 px-4 text-xs">{new Date(r.created_at).toLocaleString("es-CU")}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold">{r.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{r.customer_phone}</p>
                    </td>
                    <td className="py-3 px-4">{(r.services as any)?.name ?? "—"}</td>
                    <td className="py-3 px-4">
                      <Select value={r.status} onValueChange={(v) => updateRequestStatus(r.id, v)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px] truncate">{r.message ?? "—"}</td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No hay solicitudes aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Service dialog */}
      <Dialog open={svcDialog} onOpenChange={setSvcDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSvc?.id ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
            <DialogDescription>Configura el servicio que verán tus clientes.</DialogDescription>
          </DialogHeader>
          {editingSvc && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={editingSvc.name} onChange={(e) => setEditingSvc({ ...editingSvc, name: e.target.value, slug: editingSvc.id ? editingSvc.slug : slugify(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={editingSvc.slug} onChange={(e) => setEditingSvc({ ...editingSvc, slug: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción corta</Label>
                <Input value={editingSvc.short_description ?? ""} onChange={(e) => setEditingSvc({ ...editingSvc, short_description: e.target.value })} placeholder="Resumen en una línea" />
              </div>
              <div className="space-y-2">
                <Label>Descripción completa</Label>
                <Textarea value={editingSvc.description ?? ""} onChange={(e) => setEditingSvc({ ...editingSvc, description: e.target.value })} className="min-h-[100px]" />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Precio numérico</Label>
                  <Input type="number" step="0.01" value={editingSvc.price ?? ""} onChange={(e) => setEditingSvc({ ...editingSvc, price: e.target.value ? Number(e.target.value) : null })} placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label>Etiqueta de precio</Label>
                  <Input value={editingSvc.price_label ?? ""} onChange={(e) => setEditingSvc({ ...editingSvc, price_label: e.target.value })} placeholder="Desde $50 / Consultar" />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={editingSvc.currency ?? "USD"} onValueChange={(v) => setEditingSvc({ ...editingSvc, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CUP">CUP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={editingSvc.category_id ?? "none"} onValueChange={(v) => setEditingSvc({ ...editingSvc, category_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Posición</Label>
                  <Input type="number" value={editingSvc.sort_order ?? 0} onChange={(e) => setEditingSvc({ ...editingSvc, sort_order: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagen</Label>
                {editingSvc.image_url && (
                  <img src={editingSvc.image_url} alt="" className="w-32 h-32 object-cover rounded-xl" />
                )}
                <label className="flex items-center gap-2 cursor-pointer text-sm text-primary">
                  <ImageIcon className="w-4 h-4" /> {uploading ? "Subiendo..." : "Subir imagen"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </label>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2"><Switch checked={!!editingSvc.is_active} onCheckedChange={(v) => setEditingSvc({ ...editingSvc, is_active: v })} /> Activo</label>
                <label className="flex items-center gap-2"><Switch checked={!!editingSvc.is_featured} onCheckedChange={(v) => setEditingSvc({ ...editingSvc, is_featured: v })} /> Destacado</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSvcDialog(false)}>Cancelar</Button>
            <Button variant="hero" onClick={saveService}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat?.id ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          {editingCat && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value, slug: editingCat.id ? editingCat.slug : slugify(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={editingCat.slug} onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={editingCat.description ?? ""} onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icono</Label>
                  <Select value={editingCat.icon ?? "Wrench"} onValueChange={(v) => setEditingCat({ ...editingCat, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input type="number" value={editingCat.sort_order ?? 0} onChange={(e) => setEditingCat({ ...editingCat, sort_order: Number(e.target.value) })} />
                </div>
              </div>
              <label className="flex items-center gap-2"><Switch checked={!!editingCat.is_active} onCheckedChange={(v) => setEditingCat({ ...editingCat, is_active: v })} /> Activa</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatDialog(false)}>Cancelar</Button>
            <Button variant="hero" onClick={saveCategory}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

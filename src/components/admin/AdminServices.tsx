import { useEffect, useMemo, useState } from "react";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { serviceSchema } from "@/lib/schemas";
import { Service } from "@/types";
import { useAdminServices } from "@/hooks/admin/use-admin-services";
import { slugify } from "@/lib/format";

const empty: Partial<Service> = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  price: 0,
  currency: "USD",
  category: "",
  features: [],
  is_active: true,
  sort_order: 0,
};

export function AdminServices() {
  const { services, loading, refresh, deleteService } = useAdminServices();
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [featureInput, setFeatureInput] = useState("");

  const saveService = async () => {
    if (!editing) return;

    const dataToValidate = {
      ...editing,
      slug: editing.slug?.trim() || slugify(editing.title ?? ""),
      price: editing.price != null ? Number(editing.price) : null,
      sort_order: Number(editing.sort_order ?? 0),
      features: Array.isArray(editing.features) ? editing.features.filter(Boolean) : [],
    };

    const result = serviceSchema.safeParse(dataToValidate);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(`${firstError.path.join(".")}: ${firstError.message}`);
      return;
    }

    const payload = result.data;
    if (editing.id) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Servicio actualizado");
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Servicio creado");
    }

    setDialogOpen(false);
    setEditing(null);
    refresh();
  };

  const reorderService = async (service: Service, direction: "up" | "down") => {
    const index = services.findIndex((item) => item.id === service.id);
    if (index === -1) return;
    const target = services[direction === "up" ? index - 1 : index + 1];
    if (!target) return;

    const { error } = await supabase.from("services").update({ sort_order: target.sort_order }).eq("id", service.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { error: error2 } = await supabase.from("services").update({ sort_order: service.sort_order }).eq("id", target.id);
    if (error2) {
      toast.error(error2.message);
      return;
    }
    refresh();
  };

  const groupedCategories = useMemo(() => {
    const categories = new Set<string>();
    services.forEach((service) => { if (service.category) categories.add(service.category); });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [services]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Servicios activos e inactivos</p>
          <h2 className="font-display text-3xl font-bold">Admin de servicios</h2>
        </div>
        <Button variant="hero" onClick={() => { setEditing({ ...empty, sort_order: services.length }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Nuevo servicio
        </Button>
      </div>

      <div className="grid gap-4">
        {services.map((service, index) => (
          <div key={service.id} className="card-elevated p-4 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">{service.category || "Sin categoría"}</span>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">Orden {service.sort_order ?? 0}</span>
                  <span className={service.is_active ? "rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold" : "rounded-full bg-muted px-2 py-1 text-xs font-semibold"}>
                    {service.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mt-3">{service.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{service.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => reorderService(service, "up")} disabled={index === 0}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => reorderService(service, "down")} disabled={index === services.length - 1}>
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(service); setDialogOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                      <p className="text-sm text-muted-foreground">Se borrará «{service.title}»</p>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive" onClick={() => deleteService(service.id)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Precio</p>
                <p className="font-semibold">{service.currency === "CUP" ? `${service.price} CUP` : `${service.price} USD`}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Características</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {(service.features ?? []).map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
        {services.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">Sin servicios aún. Crea el primero para que aparezca en la web.</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
            <DialogDescription>Define el servicio, el precio, la categoría y lo que incluye.</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Título *</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Slug</Label><Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Categoría</Label><Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Ej: Desarrollo web" /></div>
                <div className="space-y-2"><Label>Orden</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Precio</Label><Input type="number" step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Moneda</Label><Select value={editing.currency ?? "USD"} onValueChange={(v) => setEditing({ ...editing, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="CUP">CUP</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>Resumen</Label><Textarea value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descripción detallada</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="min-h-[120px]" /></div>
              <div className="space-y-2">
                <Label>Características / ventajas</Label>
                <div className="flex gap-2">
                  <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="Ej: Instalación + prueba" />
                  <Button onClick={() => {
                    if (!featureInput.trim()) return;
                    setEditing((prev) => prev ? { ...prev, features: [...(prev.features ?? []), featureInput.trim()] } : prev);
                    setFeatureInput("");
                  }}>Añadir</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editing.features ?? []).map((feature, idx) => (
                    <button key={idx} type="button" onClick={() => setEditing((prev) => {
                      if (!prev) return prev;
                      const next = [...(prev.features ?? [])];
                      next.splice(idx, 1);
                      return { ...prev, features: next };
                    })} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-muted transition">{feature} ×</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Activo</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={saveService}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

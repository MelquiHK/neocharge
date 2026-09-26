import { useEffect, useMemo, useState } from "react";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { serviceSchema } from "@/lib/schemas";
import { Service } from "@/types";
import { useAdminServices } from "@/hooks/admin/use-admin-services";
import { slugify } from "@/lib/format";
import {
  AdminCard,
  AdminSectionHeader,
  AdminEmptyState,
  AdminLoading,
  StatusBadge,
  AdminTable,
  AdminTableHead,
  adminTh,
  adminTd,
  adminTr,
} from "./ui";

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
      <AdminSectionHeader
        icon={Wrench}
        title="Servicios"
        description="Servicios técnicos de reparación e instalación."
        actions={
          <>
            <span className="self-center text-sm text-muted-foreground">
              {services.length} servicios
            </span>
            <Button variant="hero" className="h-11" onClick={() => { setEditing({ ...empty, sort_order: services.length }); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Nuevo servicio
            </Button>
          </>
        }
      />

      {loading && services.length === 0 ? (
        <AdminLoading label="Cargando servicios…" />
      ) : services.length === 0 ? (
        <AdminEmptyState
          icon={Wrench}
          title="Sin servicios aún"
          description="Crea el primero para que aparezca en la web."
          action={
            <Button variant="hero" className="h-11" onClick={() => { setEditing({ ...empty, sort_order: services.length }); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Nuevo servicio
            </Button>
          }
        />
      ) : (
        <AdminCard className="p-2 sm:p-3">
          <AdminTable className="border-0">
            <AdminTableHead>
              <tr>
                <th className={adminTh}>Servicio</th>
                <th className={adminTh}>Precio</th>
                <th className={adminTh}>Incluye</th>
                <th className={adminTh}>Estado</th>
                <th className={`${adminTh} text-right`}>Acciones</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {services.map((service, index) => (
                <tr key={service.id} className={adminTr}>
                  <td className={adminTd}>
                    <p className="font-bold">{service.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {service.category || "Sin categoría"} · Orden {service.sort_order ?? 0}
                    </p>
                    {service.summary && (
                      <p className="mt-1 line-clamp-2 max-w-sm text-xs text-muted-foreground">{service.summary}</p>
                    )}
                  </td>
                  <td className={adminTd}>
                    <span className="whitespace-nowrap font-bold">
                      {service.currency === "CUP" ? `${service.price} CUP` : `${service.price} USD`}
                    </span>
                  </td>
                  <td className={adminTd}>
                    {(service.features ?? []).length > 0 ? (
                      <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                        {(service.features ?? []).map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={adminTd}>
                    <StatusBadge tone={service.is_active ? "success" : "neutral"}>
                      {service.is_active ? "Activo" : "Inactivo"}
                    </StatusBadge>
                  </td>
                  <td className={adminTd}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Subir orden" onClick={() => reorderService(service, "up")} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Bajar orden" onClick={() => reorderService(service, "down")} disabled={index === services.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Editar servicio" onClick={() => { setEditing(service); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive hover:text-destructive" aria-label="Eliminar servicio">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminCard>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
            <DialogDescription>Define el servicio, el precio, la categoría y lo que incluye.</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Datos del servicio
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Título *</Label><Input className="h-11" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Slug</Label><Input className="h-11" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Categoría</Label><Input className="h-11" value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Ej: Desarrollo web" /></div>
                  <div className="space-y-2"><Label>Orden</Label><Input className="h-11" type="number" inputMode="numeric" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
                </div>
              </fieldset>

              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Precio
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Precio</Label><Input className="h-11" type="number" step="0.01" inputMode="decimal" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Moneda</Label><Select value={editing.currency ?? "USD"} onValueChange={(v) => setEditing({ ...editing, currency: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="CUP">CUP</SelectItem></SelectContent></Select></div>
                </div>
              </fieldset>

              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Contenido
                </legend>
                <div className="space-y-2"><Label>Resumen</Label><Textarea value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} className="min-h-[60px]" /></div>
                <div className="space-y-2"><Label>Descripción detallada</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="min-h-[120px]" /></div>
              </fieldset>

              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Características / ventajas
                </legend>
                <div className="flex gap-2">
                  <Input className="h-11" value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="Ej: Instalación + prueba" />
                  <Button className="h-11 shrink-0" onClick={() => {
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
                    })} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium transition hover:bg-muted" aria-label={`Quitar ${feature}`}>{feature} ×</button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Visibilidad
                </legend>
                <Label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" className="h-5 w-5 shrink-0 accent-primary" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                  <span>Activo (visible para clientes)</span>
                </Label>
              </fieldset>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="h-11 w-full sm:w-auto" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="hero" className="h-11 w-full sm:w-auto" onClick={saveService}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

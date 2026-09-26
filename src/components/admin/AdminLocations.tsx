import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, MapPin, Navigation, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAdminLocations, StoreLocationInput } from "@/hooks/admin/use-admin-locations";
import {
  AdminCard,
  AdminSectionHeader,
  AdminEmptyState,
  AdminLoading,
  StatusBadge,
} from "./ui";

const emptyLocation: StoreLocationInput = {
  name: "",
  address: "",
  phone: null,
  location_type: "both",
  latitude: null,
  longitude: null,
  map_link: null,
  hours: null,
  notes: null,
  is_active: true,
  sort_order: 0,
};

export function AdminLocations() {
  const { locations, loading, refresh, saveLocation, deleteLocation } = useAdminLocations();
  const [editing, setEditing] = useState<StoreLocationInput | null>(null);
  const [open, setOpen] = useState(false);

  const captureCurrentLocation = () => {
    if (!navigator.geolocation || !editing) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditing({
          ...editing,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          map_link: `https://www.google.com/maps/search/?api=1&query=${pos.coords.latitude},${pos.coords.longitude}`,
        });
        toast.success("Ubicación del local capturada");
      },
      () => toast.error("No se pudo obtener la ubicación"),
    );
  };

  const save = async () => {
    if (!editing?.name?.trim() || !editing?.address?.trim()) {
      toast.error("Nombre y dirección son obligatorios");
      return;
    }

    await saveLocation({
      ...editing,
      name: editing.name.trim(),
      address: editing.address.trim(),
      phone: editing.phone?.trim() || null,
      map_link: editing.map_link?.trim() || null,
      hours: editing.hours?.trim() || null,
      notes: editing.notes?.trim() || null,
      location_type: editing.location_type || "both",
    });
    setOpen(false);
    refresh();
  };

  const remove = async (id?: string) => {
    if (!id) return;
    await deleteLocation(id);
    refresh();
  };

  const typeLabel = (t: string) => ({ electronics: "Electrónica", chargers: "Cargadores", both: "Mixto" }[t] ?? t);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={MapPin}
        title="Locales"
        description="Puntos de venta, almacenes y horarios."
        actions={
          <>
            <span className="self-center text-sm text-muted-foreground">
              {locations.length} locales registrados
            </span>
            <Button variant="hero" className="h-11" onClick={() => { setEditing({ ...emptyLocation, sort_order: locations.length }); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Nuevo local
            </Button>
          </>
        }
      />

      {loading && locations.length === 0 ? (
        <AdminLoading label="Cargando locales…" />
      ) : locations.length === 0 ? (
        <AdminEmptyState
          icon={MapPin}
          title="No hay locales registrados"
          description="Crea el primero con «Nuevo local»."
          action={
            <Button variant="hero" className="h-11" onClick={() => { setEditing({ ...emptyLocation, sort_order: locations.length }); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Nuevo local
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.map((l) => (
            <AdminCard key={l.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold leading-tight tracking-tight">{l.name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone="info">{typeLabel(l.location_type)}</StatusBadge>
                      <StatusBadge tone={l.is_active ? "success" : "neutral"}>
                        {l.is_active ? "Activo" : "Inactivo"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Editar local" onClick={() => { setEditing({ ...emptyLocation, ...l, name: String(l.name ?? ""), address: String(l.address ?? ""), location_type: String(l.location_type ?? "") }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive hover:text-destructive" aria-label="Eliminar local">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar local?</AlertDialogTitle>
                        <p className="text-sm text-muted-foreground">Se eliminará "{l.name}".</p>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(l.id)} className="bg-destructive">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{l.address}</span>
                </div>
                {l.latitude != null && l.longitude != null && (
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">
                      {Number(l.latitude).toFixed(6)}, {Number(l.longitude).toFixed(6)}
                    </span>
                  </div>
                )}
                {l.hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{l.hours}</span>
                  </div>
                )}
                {l.map_link && (
                  <a
                    href={l.map_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 pt-0.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Ver en mapa
                  </a>
                )}
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar local" : "Nuevo local"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Datos básicos
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input className="h-11" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Local Vedado" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={editing.location_type} onValueChange={(v) => setEditing({ ...editing, location_type: v })}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Electrónica</SelectItem>
                        <SelectItem value="chargers">Cargadores moto</SelectItem>
                        <SelectItem value="both">Mixto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección *</Label>
                  <Input className="h-11" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
                </div>
              </fieldset>

              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Contacto y horario
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input className="h-11" value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} inputMode="tel" />
                  </div>
                  <div className="space-y-2">
                    <Label>Horario</Label>
                    <Input className="h-11" value={editing.hours ?? ""} onChange={(e) => setEditing({ ...editing, hours: e.target.value })} placeholder="Lun-Sáb 9am-7pm" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ubicación
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-11" type="number" step="any" inputMode="decimal" placeholder="Latitud" value={editing.latitude ?? ""} onChange={(e) => setEditing({ ...editing, latitude: e.target.value ? Number(e.target.value) : null })} />
                  <Input className="h-11" type="number" step="any" inputMode="decimal" placeholder="Longitud" value={editing.longitude ?? ""} onChange={(e) => setEditing({ ...editing, longitude: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" onClick={captureCurrentLocation}>
                  <Navigation className="h-4 w-4" /> Usar mi ubicación actual
                </Button>
                <div className="space-y-2">
                  <Label>Link de Google Maps (opcional)</Label>
                  <Input className="h-11" value={editing.map_link ?? ""} onChange={(e) => setEditing({ ...editing, map_link: e.target.value })} placeholder="https://maps.google.com/..." inputMode="url" />
                </div>
              </fieldset>

              <fieldset className="space-y-3 rounded-2xl border border-border/60 p-4">
                <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Notas y visibilidad
                </legend>
                <div className="space-y-2">
                  <Label>Notas internas</Label>
                  <Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className="min-h-[60px]" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                  <Label>Activo (visible para clientes)</Label>
                </div>
              </fieldset>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="h-11 w-full sm:w-auto" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="hero" className="h-11 w-full sm:w-auto" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

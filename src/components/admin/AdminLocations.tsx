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
import { Plus, Pencil, Trash2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useAdminLocations, StoreLocationInput } from "@/hooks/admin/use-admin-locations";

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{locations.length} locales registrados</p>
        <Button variant="hero" onClick={() => { setEditing({ ...emptyLocation, sort_order: locations.length }); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Nuevo local
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {locations.map((l) => (
          <div key={l.id} className="card-elevated p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-lg">{l.name}</h3>
                <p className="text-xs text-primary uppercase tracking-wider font-semibold">{typeLabel(l.location_type)}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
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
            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><span>{l.address}</span></div>
              {l.phone && <p className="text-muted-foreground">📞 {l.phone}</p>}
              {l.hours && <p className="text-muted-foreground">🕐 {l.hours}</p>}
              {l.map_link && <a href={l.map_link} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">Ver en mapa</a>}
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <div className="md:col-span-2 card-elevated p-10 text-center text-muted-foreground">
            No hay locales todavía. Crea el primero con "Nuevo local".
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar local" : "Nuevo local"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Local Vedado" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editing.location_type} onValueChange={(v) => setEditing({ ...editing, location_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Horario</Label>
                  <Input value={editing.hours ?? ""} onChange={(e) => setEditing({ ...editing, hours: e.target.value })} placeholder="Lun-Sáb 9am-7pm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ubicación GPS</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" step="any" placeholder="Latitud" value={editing.latitude ?? ""} onChange={(e) => setEditing({ ...editing, latitude: e.target.value ? Number(e.target.value) : null })} />
                  <Input type="number" step="any" placeholder="Longitud" value={editing.longitude ?? ""} onChange={(e) => setEditing({ ...editing, longitude: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={captureCurrentLocation}>
                  <Navigation className="w-4 h-4" /> Usar mi ubicación actual
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Link de Google Maps (opcional)</Label>
                <Input value={editing.map_link ?? ""} onChange={(e) => setEditing({ ...editing, map_link: e.target.value })} placeholder="https://maps.google.com/..." />
              </div>
              <div className="space-y-2">
                <Label>Notas internas</Label>
                <Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className="min-h-[60px]" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Activo (visible para clientes)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

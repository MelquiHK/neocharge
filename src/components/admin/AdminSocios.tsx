import { useState } from "react";
import {
  useAdminPartners,
  type Partner,
  type PartnerLocation,
  type PartnerLedgerEntry,
  type PartnerInput,
  type PartnerLocationInput,
} from "@/hooks/admin/use-admin-partners";
import {
  AdminCard,
  AdminSectionHeader,
  AdminCardTitle,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Wallet,
  History,
  Handshake,
  User,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const emptyPartner: PartnerInput = {
  name: "",
  contact_name: "",
  phone_private: "",
  notes: "",
  is_active: true,
};

const emptyLocation: PartnerLocationInput = {
  partner_id: "",
  name: "",
  address: "",
  area: "",
  attendant_name: "",
  map_link: "",
  hours: "",
  notes: "",
  is_active: true,
};

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const kindLabels: Record<PartnerLedgerEntry["kind"], string> = {
  hold: "Margen retenido",
  pickup: "Cobro",
  adjustment: "Ajuste",
};

export function AdminSocios() {
  const {
    partners,
    balances,
    loading,
    needsMigration,
    savePartner,
    deletePartner,
    loadLocations,
    saveLocation,
    deleteLocation,
    loadLedger,
    registerPickup,
  } = useAdminPartners();

  const [partnerDialog, setPartnerDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState<(PartnerInput & { id?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [locationsByPartner, setLocationsByPartner] = useState<Record<string, PartnerLocation[]>>({});
  const [ledgerByPartner, setLedgerByPartner] = useState<Record<string, PartnerLedgerEntry[]>>({});

  const [locationDialog, setLocationDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<(PartnerLocationInput & { id?: string }) | null>(null);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<PartnerLocation | null>(null);

  const [pickupDialog, setPickupDialog] = useState(false);
  const [pickupPartner, setPickupPartner] = useState<Partner | null>(null);
  const [pickupAmount, setPickupAmount] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");

  const expand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Si ya hay datos cacheados, no hace falta mostrar el estado de carga.
    if (locationsByPartner[id] && ledgerByPartner[id]) return;
    setExpandingId(id);
    try {
      const [locs, ledger] = await Promise.all([loadLocations(id), loadLedger(id)]);
      setLocationsByPartner((p) => ({ ...p, [id]: locs }));
      setLedgerByPartner((p) => ({ ...p, [id]: ledger }));
    } finally {
      setExpandingId((cur) => (cur === id ? null : cur));
    }
  };

  const reloadExpanded = async (id: string) => {
    const [locs, ledger] = await Promise.all([loadLocations(id), loadLedger(id)]);
    setLocationsByPartner((p) => ({ ...p, [id]: locs }));
    setLedgerByPartner((p) => ({ ...p, [id]: ledger }));
  };

  const openNewPartner = () => {
    setEditingPartner({ ...emptyPartner });
    setPartnerDialog(true);
  };

  const handleSavePartner = async () => {
    if (!editingPartner?.name.trim()) {
      toast.error("El nombre del socio es obligatorio");
      return;
    }
    const normalized = editingPartner.name.trim().toLowerCase();
    const duplicate = partners.some(
      (x) => x.id !== editingPartner?.id && x.name.trim().toLowerCase() === normalized
    );
    if (duplicate) {
      toast.error("Ya existe un socio con ese nombre");
      return;
    }
    const ok = await savePartner({
      ...editingPartner,
      name: editingPartner.name.trim(),
      contact_name: editingPartner.contact_name?.trim() || null,
      phone_private: editingPartner.phone_private?.trim() || null,
      notes: editingPartner.notes?.trim() || null,
    });
    if (ok) {
      setPartnerDialog(false);
      setEditingPartner(null);
    }
  };

  const openNewLocation = (partnerId: string) => {
    setEditingLocation({ ...emptyLocation, partner_id: partnerId });
    setLocationDialog(true);
  };

  const handleSaveLocation = async () => {
    if (!editingLocation?.name.trim() || !editingLocation.address.trim()) {
      toast.error("Nombre y dirección del local son obligatorios");
      return;
    }
    const ok = await saveLocation({
      ...editingLocation,
      name: editingLocation.name.trim(),
      address: editingLocation.address.trim(),
      area: editingLocation.area?.trim() || null,
      attendant_name: editingLocation.attendant_name?.trim() || null,
      map_link: editingLocation.map_link?.trim() || null,
      hours: editingLocation.hours?.trim() || null,
      notes: editingLocation.notes?.trim() || null,
    });
    if (ok && editingLocation.partner_id) {
      setLocationDialog(false);
      setEditingLocation(null);
      await reloadExpanded(editingLocation.partner_id);
    }
  };

  const openPickup = (partner: Partner) => {
    setPickupPartner(partner);
    const bal = balances[partner.id] ?? 0;
    setPickupAmount(bal > 0 ? bal.toFixed(2) : "");
    setPickupNotes("");
    setPickupDialog(true);
  };

  const handlePickup = async () => {
    if (!pickupPartner) return;
    const amount = Number(pickupAmount);
    if (!amount || amount <= 0) {
      toast.error("Indica un monto válido en USD");
      return;
    }
    const ok = await registerPickup(pickupPartner.id, amount, pickupNotes);
    if (ok) {
      setPickupDialog(false);
      setPickupPartner(null);
      if (expandedId === pickupPartner.id) await reloadExpanded(pickupPartner.id);
    }
  };

  if (loading) return <AdminLoading label="Cargando socios…" />;

  if (needsMigration) {
    return (
      <div className="space-y-6">
        <AdminSectionHeader
          icon={Handshake}
          title="Socios"
          description="Negocios asociados: sus locales, el stock de tus productos en cada local y el dinero pendiente de recoger."
        />
        <AdminCard className="p-6">
          <AdminCardTitle icon={Handshake} title="Falta aplicar la migración" />
          <p className="mt-2 text-sm text-muted-foreground">
            Para usar los socios hay que crear las tablas en Supabase. En el dashboard ve a{" "}
            <span className="font-mono font-semibold">SQL Editor</span>, pega el contenido del archivo{" "}
            <span className="font-mono">supabase/migrations/20261006190000_partner_fulfillment.sql</span>{" "}
            del repo y ejecútalo. Después recarga esta página.
          </p>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={Handshake}
        title="Socios"
        description="Negocios asociados: sus locales, el stock de tus productos en cada local y el dinero pendiente de recoger. Todo esto es interno: el cliente nunca lo ve."
        actions={
          <Button onClick={openNewPartner} className="h-11">
            <Plus className="h-4 w-4" /> Nuevo socio
          </Button>
        }
      />

      {partners.length === 0 ? (
        <AdminEmptyState
          icon={Handshake}
          title="Sin socios todavía"
          description="Agrega tu primer socio para vender sus productos como si fueran tuyos."
          action={<Button onClick={openNewPartner}><Plus className="h-4 w-4" /> Nuevo socio</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {partners.map((p) => {
            const bal = balances[p.id] ?? 0;
            const expanded = expandedId === p.id;
            const expandedLoading = expanded && expandingId === p.id;
            const locs = locationsByPartner[p.id] ?? [];
            const ledger = ledgerByPartner[p.id] ?? [];
            return (
              <AdminCard key={p.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => void expand(p.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Handshake className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        {!p.is_active && <Badge variant="secondary">Inactivo</Badge>}
                      </div>
                      {p.contact_name && (
                        <p className="truncate text-sm text-muted-foreground">Contacto: {p.contact_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Por recoger</p>
                      <p className={`font-mono text-lg font-bold ${bal > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {fmtUsd(bal)}
                      </p>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-5 border-t border-border/60 p-4">
                    {/* Acciones del socio */}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setEditingPartner({ ...p }); setPartnerDialog(true); }}>
                        <Pencil className="h-3.5 w-3.5" /> Editar socio
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openPickup(p)} disabled={bal <= 0}>
                        <Wallet className="h-3.5 w-3.5" /> Registrar cobro
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </Button>
                    </div>

                    {p.phone_private && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" /> {p.phone_private}
                        <span className="text-xs">(privado — nunca se muestra al cliente)</span>
                      </p>
                    )}
                    {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}

                    {expandedLoading ? (
                      <p className="animate-pulse text-sm text-muted-foreground">Cargando locales y movimientos…</p>
                    ) : (
                      <>
                    {/* Locales */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <AdminCardTitle icon={MapPin} title={`Locales (${locs.length})`} />
                        <Button size="sm" variant="outline" onClick={() => openNewLocation(p.id)}>
                          <Plus className="h-3.5 w-3.5" /> Agregar local
                        </Button>
                      </div>
                      {locs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin locales. Agrega el primero.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {locs.map((l) => (
                            <div key={l.id} className="rounded-xl border border-border/60 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium">{l.name}</p>
                                  <p className="text-sm text-muted-foreground">{l.address}</p>
                                  {l.area && <p className="text-xs text-muted-foreground">{l.area}</p>}
                                  {l.attendant_name && (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" /> Atiende: {l.attendant_name}
                                    </p>
                                  )}
                                  {l.hours && <p className="text-xs text-muted-foreground">Horario: {l.hours}</p>}
                                  {l.map_link && (
                                    <a href={l.map_link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                      Ver en mapa <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingLocation({ ...l }); setLocationDialog(true); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteLocationTarget(l)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Historial de saldos */}
                    <div>
                      <AdminCardTitle icon={History} title={`Movimientos (${ledger.length})`} />
                      {ledger.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          {ledger.map((e) => (
                            <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
                              <div className="min-w-0">
                                <span className="font-medium">{kindLabels[e.kind]}</span>
                                {e.notes && <span className="text-muted-foreground"> — {e.notes}</span>}
                                <p className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</p>
                              </div>
                              <span className={`shrink-0 font-mono font-semibold ${e.kind === "pickup" ? "text-emerald-600" : "text-amber-600"}`}>
                                {e.kind === "pickup" ? "−" : "+"}{fmtUsd(Number(e.amount_usd))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                      </>
                    )}
                  </div>
                )}
              </AdminCard>
            );
          })}
        </div>
      )}

      {/* Diálogo socio */}
      <Dialog open={partnerDialog} onOpenChange={setPartnerDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPartner?.id ? "Editar socio" : "Nuevo socio"}</DialogTitle>
            <DialogDescription>Datos internos del negocio asociado. Nada de esto se muestra al cliente.</DialogDescription>
          </DialogHeader>
          {editingPartner && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Nombre del negocio *</Label>
                <Input className="h-11" value={editingPartner.name ?? ""} onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })} placeholder="Ej: Yusi Cargadores" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Persona de contacto</Label>
                  <Input className="h-11" value={editingPartner.contact_name ?? ""} onChange={(e) => setEditingPartner({ ...editingPartner, contact_name: e.target.value })} placeholder="Ej: Yusi" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono privado</Label>
                  <Input className="h-11" value={editingPartner.phone_private ?? ""} onChange={(e) => setEditingPartner({ ...editingPartner, phone_private: e.target.value })} placeholder="Solo interno" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas internas</Label>
                <Textarea value={editingPartner.notes ?? ""} onChange={(e) => setEditingPartner({ ...editingPartner, notes: e.target.value })} placeholder="Acuerdos, condiciones, etc." />
              </div>
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch checked={!!editingPartner.is_active} onCheckedChange={(v) => setEditingPartner({ ...editingPartner, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPartnerDialog(false)}>Cancelar</Button>
            <Button onClick={handleSavePartner}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo local */}
      <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLocation?.id ? "Editar local" : "Nuevo local"}</DialogTitle>
            <DialogDescription>Punto donde el socio atiende y despacha tus productos.</DialogDescription>
          </DialogHeader>
          {editingLocation && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Nombre del local *</Label>
                <Input className="h-11" value={editingLocation.name ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })} placeholder="Ej: Yusi – Playa" />
              </div>
              <div className="space-y-2">
                <Label>Dirección *</Label>
                <Input className="h-11" value={editingLocation.address ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })} placeholder="Ej: Calle C #20512 altos" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Zona / Municipio</Label>
                  <Input className="h-11" value={editingLocation.area ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, area: e.target.value })} placeholder="Ej: Playa" />
                </div>
                <div className="space-y-2">
                  <Label>Quién atiende</Label>
                  <Input className="h-11" value={editingLocation.attendant_name ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, attendant_name: e.target.value })} placeholder="Ej: su suegro" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Latitud</Label>
                  <Input className="h-11" type="number" step="any" value={editingLocation.latitude ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, latitude: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <Label>Longitud</Label>
                  <Input className="h-11" type="number" step="any" value={editingLocation.longitude ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, longitude: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Enlace de mapa</Label>
                <Input className="h-11" value={editingLocation.map_link ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, map_link: e.target.value })} placeholder="https://…" />
              </div>
              <div className="space-y-2">
                <Label>Horario</Label>
                <Input className="h-11" value={editingLocation.hours ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, hours: e.target.value })} placeholder="Ej: 9am – 6pm" />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={editingLocation.notes ?? ""} onChange={(e) => setEditingLocation({ ...editingLocation, notes: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch checked={!!editingLocation.is_active} onCheckedChange={(v) => setEditingLocation({ ...editingLocation, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLocationDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveLocation}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo cobro */}
      <Dialog open={pickupDialog} onOpenChange={setPickupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
            <DialogDescription>
              {pickupPartner ? `Dinero que recogiste en ${pickupPartner.name}. Se descuenta del saldo pendiente.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Monto recogido (USD) *</Label>
              <Input className="h-11 font-mono" type="number" step="0.01" min="0" value={pickupAmount} onChange={(e) => setPickupAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nota</Label>
              <Input className="h-11" value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)} placeholder="Ej: recogido en el local de Playa" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPickupDialog(false)}>Cancelar</Button>
            <Button onClick={handlePickup}>Registrar cobro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar socio */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar socio</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{deleteTarget?.name}» con sus locales y su historial de saldos. Los productos que lo tengan asignado quedarán sin socio. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget && await deletePartner(deleteTarget.id)) setDeleteTarget(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar local */}
      <AlertDialog open={!!deleteLocationTarget} onOpenChange={(o) => !o && setDeleteLocationTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar local</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{deleteLocationTarget?.name}» y su registro de stock. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteLocationTarget && await deleteLocation(deleteLocationTarget.id)) {
                  const pid = deleteLocationTarget.partner_id;
                  setDeleteLocationTarget(null);
                  if (expandedId === pid) await reloadExpanded(pid);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Gestión del programa de referidos para gestores (LOTE D, mejora 9).
// Los gestores comparten https://tienda-neocharge.vercel.app/?ref=CODIGO y las
// ventas online con ese ref se atribuyen para calcular comisiones.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AdminCard,
  AdminSectionHeader,
  AdminCardTitle,
  AdminEmptyState,
  AdminLoading,
  AdminTable,
  AdminTableHead,
  adminTh,
  adminTd,
  adminTr,
} from "@/components/admin/ui";
import { Share2, Plus, Copy, Check, Pencil, Trash2, Link2, BarChart3, Dices } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, formatCUP } from "@/lib/format";

const SITE_URL = "https://tienda-neocharge.vercel.app";

interface ReferralCode {
  id: string;
  code: string;
  seller_name: string | null;
  seller_phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface ReferredOrder {
  id: string;
  ref_code: string | null;
  total: number | null;
  total_cup: number | null;
  created_at: string;
  status: string | null;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Genera un código corto legible: PREFIJO-XXXX (ej. YUSI-4F2K). */
function generateCode(sellerName: string): string {
  const prefix = (sellerName || "NC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6) || "NC";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${prefix}-${suffix}`;
}

function referralLink(code: string): string {
  return `${SITE_URL}/?ref=${code}`;
}

export function AdminReferrals() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [orders, setOrders] = useState<ReferredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReferralCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", seller_name: "", seller_phone: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: codeRows, error: codeError }, { data: orderRows, error: orderError }] =
        await Promise.all([
          supabase.from("referral_codes").select("*").order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("id,ref_code,total,total_cup,created_at,status")
            .not("ref_code", "is", null)
            .order("created_at", { ascending: false }),
        ]);
      if (codeError) throw codeError;
      if (orderError) throw orderError;
      setCodes((codeRows ?? []) as ReferralCode[]);
      setOrders((orderRows ?? []) as ReferredOrder[]);
    } catch (err: unknown) {
      toast.error("No se pudieron cargar los referidos: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: generateCode(""), seller_name: "", seller_phone: "" });
    setDialogOpen(true);
  };

  const openEdit = (row: ReferralCode) => {
    setEditing(row);
    setForm({
      code: row.code,
      seller_name: row.seller_name ?? "",
      seller_phone: row.seller_phone ?? "",
    });
    setDialogOpen(true);
  };

  const saveCode = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) {
      toast.error("El código no puede estar vacío.");
      return;
    }
    if (!form.seller_name.trim()) {
      toast.error("Ponle un nombre al gestor (ej. Yusi).");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("referral_codes")
          .update({
            code,
            seller_name: form.seller_name.trim(),
            seller_phone: form.seller_phone.trim() || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Código actualizado.");
      } else {
        const { error } = await supabase.from("referral_codes").insert({
          code,
          seller_name: form.seller_name.trim(),
          seller_phone: form.seller_phone.trim() || null,
          is_active: true,
        });
        if (error) throw error;
        toast.success("Código creado. Compártelo con el gestor.");
      }
      setDialogOpen(false);
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("duplicate") || message.includes("unique")) {
        toast.error("Ese código ya existe. Genera otro.");
      } else {
        toast.error("No se pudo guardar: " + message);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: ReferralCode) => {
    try {
      const { error } = await supabase
        .from("referral_codes")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
      setCodes((prev) => prev.map((c) => (c.id === row.id ? { ...c, is_active: !c.is_active } : c)));
      toast.success(row.is_active ? "Código desactivado." : "Código activado.");
    } catch (err: unknown) {
      toast.error("No se pudo cambiar el estado: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("referral_codes").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Código eliminado.");
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      toast.error("No se pudo eliminar: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(referralLink(code));
      setCopiedCode(code);
      toast.success("Enlace copiado. Pásaselo al gestor.");
      window.setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  // Reporte: pedidos agrupados por código de referido.
  const report = useMemo(() => {
    const byCode = new Map<string, { count: number; totalUSD: number; totalCUP: number }>();
    for (const o of orders) {
      if (!o.ref_code) continue;
      const acc = byCode.get(o.ref_code) ?? { count: 0, totalUSD: 0, totalCUP: 0 };
      acc.count += 1;
      acc.totalUSD += Number(o.total ?? 0);
      acc.totalCUP += Number(o.total_cup ?? 0);
      byCode.set(o.ref_code, acc);
    }
    return Array.from(byCode.entries())
      .map(([code, stats]) => ({
        code,
        seller: codes.find((c) => c.code === code)?.seller_name ?? "—",
        ...stats,
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders, codes]);

  const orderCountByCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) {
      if (o.ref_code) m.set(o.ref_code, (m.get(o.ref_code) ?? 0) + 1);
    }
    return m;
  }, [orders]);

  if (loading) return <AdminLoading label="Cargando referidos…" />;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={Share2}
        title="Referidos de gestores"
        description="Cada gestor comparte su enlace ?ref=CODIGO; las ventas online con ese enlace se le atribuyen para la comisión."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo código
          </Button>
        }
      />

      <AdminCard>
        <AdminCardTitle icon={Link2} title="Códigos de referido" />
        {codes.length === 0 ? (
          <AdminEmptyState
            icon={Share2}
            title="Sin códigos todavía"
            description="Crea el primer código y comparte el enlace con el gestor."
            action={
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Crear código
              </Button>
            }
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <th className={adminTh}>Código</th>
                <th className={adminTh}>Gestor</th>
                <th className={adminTh}>Teléfono</th>
                <th className={adminTh}>Enlace</th>
                <th className={adminTh}>Pedidos</th>
                <th className={adminTh}>Activo</th>
                <th className={`${adminTh} text-right`}>Acciones</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {codes.map((row) => (
                <tr key={row.id} className={adminTr}>
                  <td className={adminTd}>
                    <code className="rounded-lg bg-muted px-2 py-1 font-mono text-sm font-bold">{row.code}</code>
                  </td>
                  <td className={adminTd}>{row.seller_name ?? "—"}</td>
                  <td className={adminTd}>{row.seller_phone ?? "—"}</td>
                  <td className={adminTd}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void copyLink(row.code)}
                      title={referralLink(row.code)}
                    >
                      {copiedCode === row.code ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      Copiar enlace
                    </Button>
                  </td>
                  <td className={adminTd}>{orderCountByCode.get(row.code) ?? 0}</td>
                  <td className={adminTd}>
                    <div className="flex items-center gap-2">
                      <Switch checked={row.is_active} onCheckedChange={() => void toggleActive(row)} aria-label={`Activar código ${row.code}`} />
                      <Badge variant={row.is_active ? "default" : "secondary"}>
                        {row.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </td>
                  <td className={adminTd}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(row)} title="Eliminar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard>
        <AdminCardTitle icon={BarChart3} title="Ventas atribuidas (para comisiones)" />
        {report.length === 0 ? (
          <AdminEmptyState
            icon={BarChart3}
            title="Sin ventas atribuidas aún"
            description="Cuando un cliente compre entrando con un enlace ?ref=, el pedido aparecerá aquí."
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <th className={adminTh}>Código</th>
                <th className={adminTh}>Gestor</th>
                <th className={adminTh}>Pedidos</th>
                <th className={adminTh}>Total USD</th>
                <th className={adminTh}>Total CUP</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {report.map((r) => (
                <tr key={r.code} className={adminTr}>
                  <td className={adminTd}>
                    <code className="rounded-lg bg-muted px-2 py-1 font-mono text-sm font-bold">{r.code}</code>
                  </td>
                  <td className={adminTd}>{r.seller}</td>
                  <td className={adminTd}>{r.count}</td>
                  <td className={adminTd}>{formatPrice(r.totalUSD)}</td>
                  <td className={adminTd}>{formatCUP(r.totalCUP)}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>

      {/* Crear / editar código */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar código" : "Nuevo código de referido"}</DialogTitle>
            <DialogDescription>
              El gestor comparte el enlace con sus clientes; cada compra con ese enlace se le atribuye.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref-seller">Nombre del gestor</Label>
              <Input
                id="ref-seller"
                value={form.seller_name}
                onChange={(e) => setForm((f) => ({ ...f, seller_name: e.target.value }))}
                placeholder="Ej. Yusi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-phone">Teléfono del gestor (opcional)</Label>
              <Input
                id="ref-phone"
                value={form.seller_phone}
                onChange={(e) => setForm((f) => ({ ...f, seller_phone: e.target.value }))}
                placeholder="5XXX XXXX"
                inputMode="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-code">Código</Label>
              <div className="flex gap-2">
                <Input
                  id="ref-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="YUSI-4F2K"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm((f) => ({ ...f, code: generateCode(f.seller_name) }))}
                  title="Generar código aleatorio"
                >
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
              {form.code.trim() && (
                <p className="text-xs text-muted-foreground break-all">
                  Enlace: {referralLink(form.code.trim().toUpperCase())}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void saveCode()} disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear código"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar código */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar código {deleteTarget?.code}</AlertDialogTitle>
            <AlertDialogDescription>
              El enlace dejará de atribuir ventas a este gestor. Los pedidos ya registrados conservan
              su atribución. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

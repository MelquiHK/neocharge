import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowDown, ArrowUp, Image as ImageIcon, Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { Category } from "@/types";
import { useAdminCategories } from "@/hooks/admin/use-admin-categories";
import { categorySchema } from "@/lib/schemas";
import {
  AdminSectionHeader,
  AdminTable,
  AdminTableHead,
  AdminEmptyState,
  AdminLoading,
  adminTh,
  adminTd,
  adminTr,
} from "./ui";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const empty: Partial<Category> = { name: "", slug: "", description: "", sort_order: 0, image_url: "" };

export function AdminCategories() {
  const { categories: cats, loading, refresh, deleteCategory } = useAdminCategories();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [open, setOpen] = useState(false);

  const move = async (id: string, dir: "up" | "down") => {
    const idx = cats.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const otherIdx = dir === "up" ? idx - 1 : idx + 1;
    if (otherIdx < 0 || otherIdx >= cats.length) return;
    const a = cats[idx];
    const b = cats[otherIdx];
    const { error } = await supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    if (error) return toast.error(error.message);
    const { error: e2 } = await supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    if (e2) return toast.error(e2.message);
    refresh();
  };

  const save = async () => {
    if (!editing) return;

    const dataToValidate = {
      ...editing,
      slug: editing.slug?.trim() || slugify(editing.name ?? ""),
      sort_order: Number(editing.sort_order ?? 0),
    };

    const result = categorySchema.safeParse(dataToValidate);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(`${firstError.path.join(".")}: ${firstError.message}`);
      return;
    }

    const payload = result.data;
    if (editing.id) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Categoría guardada");
    setOpen(false);
    refresh();
  };

  const remove = async (id: string) => {
    await deleteCategory(id);
  };

  const openNew = () => {
    setEditing({ ...empty, sort_order: cats.length });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminSectionHeader
        icon={FolderTree}
        title="Categorías"
        description="Organiza tu catálogo por categorías."
        actions={
          <Button variant="hero" className="h-11" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nueva
          </Button>
        }
      />

      <p className="text-sm text-muted-foreground">
        {cats.length} {cats.length === 1 ? "categoría" : "categorías"}
      </p>

      {loading && cats.length === 0 ? (
        <AdminLoading label="Cargando categorías…" />
      ) : cats.length === 0 ? (
        <AdminEmptyState
          icon={FolderTree}
          title="Sin categorías"
          description="Crea la primera categoría para empezar a organizar tu catálogo."
          action={
            <Button variant="hero" className="h-11" onClick={openNew}>
              <Plus className="h-4 w-4" /> Crear categoría
            </Button>
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <th className={adminTh}>Orden</th>
              <th className={adminTh}>Imagen</th>
              <th className={adminTh}>Nombre</th>
              <th className={adminTh}>Slug</th>
              <th className={`${adminTh} text-right`}>Acciones</th>
            </tr>
          </AdminTableHead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className={adminTr}>
                <td className={adminTd}>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10"
                      onClick={() => c.id && move(c.id, "up")}
                      disabled={cats[0]?.id === c.id}
                      aria-label="Subir orden"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10"
                      onClick={() => c.id && move(c.id, "down")}
                      disabled={cats[cats.length - 1]?.id === c.id}
                      aria-label="Bajar orden"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
                <td className={adminTd}>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </td>
                <td className={adminTd}>
                  <p className="font-semibold">{c.name}</p>
                </td>
                <td className={adminTd}>
                  <p className="font-mono text-xs text-muted-foreground">{c.slug}</p>
                </td>
                <td className={`${adminTd} text-right`}>
                  <div className="inline-flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10"
                      onClick={() => { setEditing(c); setOpen(true); }}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive" aria-label="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar "{c.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            La categoría se eliminará definitivamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => c.id && remove(c.id)} className="h-11 bg-destructive">
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              {editing?.id ? "Actualiza los datos de la categoría." : "Completa los datos de la nueva categoría."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  className="h-11"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    className="h-11 font-mono"
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    className="h-11"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Imagen (URL)</Label>
                <Input
                  className="h-11"
                  value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="h-11" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="hero" className="h-11" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

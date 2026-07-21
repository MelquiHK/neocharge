import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminSettings } from "@/hooks/admin/use-admin-settings";
import { toast } from "sonner";

export function AdminSettings() {
  const { settings, loading, saveSettings } = useAdminSettings();
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSave = async () => {
    await saveSettings(draft);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="card-elevated p-6 space-y-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/30">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-primary font-semibold">Configuración del sitio</p>
          <h2 className="font-display text-3xl font-bold">Controla la garantía y los mensajes públicos</h2>
          <p className="text-muted-foreground">Administra desde aquí el contenido de la página de garantía, la información de contacto y el texto de los locales disponibles.</p>
        </div>
      </div>

      <section className="card-elevated p-6 space-y-4">
        <h3 className="font-display text-xl font-semibold">Texto principal de Garantía</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Introducción</Label>
            <Textarea value={draft.warranty_intro ?? ""} onChange={(e) => setDraft({ ...draft, warranty_intro: e.target.value })} className="min-h-[120px]" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título cargadores</Label>
              <Input value={draft.warranty_chargers_title ?? ""} onChange={(e) => setDraft({ ...draft, warranty_chargers_title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Texto cargadores</Label>
              <Textarea value={draft.warranty_chargers_text ?? ""} onChange={(e) => setDraft({ ...draft, warranty_chargers_text: e.target.value })} className="min-h-[120px]" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título electrónica</Label>
              <Input value={draft.warranty_electronics_title ?? ""} onChange={(e) => setDraft({ ...draft, warranty_electronics_title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Texto electrónica</Label>
              <Textarea value={draft.warranty_electronics_text ?? ""} onChange={(e) => setDraft({ ...draft, warranty_electronics_text: e.target.value })} className="min-h-[120px]" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título importante</Label>
              <Input value={draft.warranty_important_title ?? ""} onChange={(e) => setDraft({ ...draft, warranty_important_title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Texto importante</Label>
              <Textarea value={draft.warranty_important_text ?? ""} onChange={(e) => setDraft({ ...draft, warranty_important_text: e.target.value })} className="min-h-[120px]" />
            </div>
          </div>
        </div>
      </section>

      <section className="card-elevated p-6 space-y-4">
        <h3 className="font-display text-xl font-semibold">Soporte y contacto</h3>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título de soporte</Label>
            <Input value={draft.warranty_support_title ?? ""} onChange={(e) => setDraft({ ...draft, warranty_support_title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Texto de soporte</Label>
            <Textarea value={draft.warranty_support_text ?? ""} onChange={(e) => setDraft({ ...draft, warranty_support_text: e.target.value })} className="min-h-[120px]" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>WhatsApp URL</Label>
            <Input value={draft.whatsapp_url ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp_url: e.target.value })} placeholder="https://wa.me/5363180910" />
          </div>
          <div className="space-y-2">
            <Label>Página de contacto</Label>
            <Input value={draft.contact_url ?? ""} onChange={(e) => setDraft({ ...draft, contact_url: e.target.value })} placeholder="/contacto" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={draft.support_phone ?? ""} onChange={(e) => setDraft({ ...draft, support_phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Correo</Label>
            <Input value={draft.support_email ?? ""} onChange={(e) => setDraft({ ...draft, support_email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input value={draft.support_address ?? ""} onChange={(e) => setDraft({ ...draft, support_address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Horario</Label>
            <Input value={draft.support_hours ?? ""} onChange={(e) => setDraft({ ...draft, support_hours: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="card-elevated p-6 space-y-4">
        <h3 className="font-display text-xl font-semibold">Texto para locales</h3>
        <div className="space-y-2">
          <Label>Descripción de compra por local</Label>
          <Textarea value={draft.locations_intro ?? ""} onChange={(e) => setDraft({ ...draft, locations_intro: e.target.value })} className="min-h-[120px]" />
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="hero" onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</Button>
      </div>
    </div>
  );
}

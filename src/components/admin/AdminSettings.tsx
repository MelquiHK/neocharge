import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminSettings } from "@/hooks/admin/use-admin-settings";
import { toast } from "sonner";
import { Settings, ShieldCheck, Headset, MapPin, Save } from "lucide-react";
import { AdminCard, AdminCardTitle, AdminSectionHeader } from "./ui";

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
    <div className="max-w-5xl space-y-6">
      <AdminSectionHeader
        icon={Settings}
        title="Configuración"
        description="Ajustes del sistema, permisos e integraciones."
      />

      <AdminCard className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-primary font-semibold">Configuración del sitio</p>
          <h3 className="font-display text-2xl font-bold sm:text-3xl">Controla la garantía y los mensajes públicos</h3>
          <p className="text-muted-foreground">Administra desde aquí el contenido de la página de garantía, la información de contacto y el texto de los locales disponibles.</p>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardTitle icon={ShieldCheck} title="Texto principal de Garantía" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">Introducción</Label>
            <Textarea value={draft.warranty_intro ?? ""} onChange={(e) => setDraft({ ...draft, warranty_intro: e.target.value })} className="min-h-[120px] rounded-xl" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold">Título cargadores</Label>
              <Input value={draft.warranty_chargers_title ?? ""} onChange={(e) => setDraft({ ...draft, warranty_chargers_title: e.target.value })} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Texto cargadores</Label>
              <Textarea value={draft.warranty_chargers_text ?? ""} onChange={(e) => setDraft({ ...draft, warranty_chargers_text: e.target.value })} className="min-h-[120px] rounded-xl" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold">Título electrónica</Label>
              <Input value={draft.warranty_electronics_title ?? ""} onChange={(e) => setDraft({ ...draft, warranty_electronics_title: e.target.value })} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Texto electrónica</Label>
              <Textarea value={draft.warranty_electronics_text ?? ""} onChange={(e) => setDraft({ ...draft, warranty_electronics_text: e.target.value })} className="min-h-[120px] rounded-xl" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold">Título importante</Label>
              <Input value={draft.warranty_important_title ?? ""} onChange={(e) => setDraft({ ...draft, warranty_important_title: e.target.value })} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Texto importante</Label>
              <Textarea value={draft.warranty_important_text ?? ""} onChange={(e) => setDraft({ ...draft, warranty_important_text: e.target.value })} className="min-h-[120px] rounded-xl" />
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardTitle icon={Headset} title="Soporte y contacto" />
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold">Título de soporte</Label>
              <Input value={draft.warranty_support_title ?? ""} onChange={(e) => setDraft({ ...draft, warranty_support_title: e.target.value })} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Texto de soporte</Label>
              <Textarea value={draft.warranty_support_text ?? ""} onChange={(e) => setDraft({ ...draft, warranty_support_text: e.target.value })} className="min-h-[120px] rounded-xl" />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold">WhatsApp URL</Label>
              <Input value={draft.whatsapp_url ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp_url: e.target.value })} placeholder="https://wa.me/5363180910" className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Página de contacto</Label>
              <Input value={draft.contact_url ?? ""} onChange={(e) => setDraft({ ...draft, contact_url: e.target.value })} placeholder="/contacto" className="min-h-11 rounded-xl" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold">Teléfono</Label>
              <Input value={draft.support_phone ?? ""} onChange={(e) => setDraft({ ...draft, support_phone: e.target.value })} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Correo</Label>
              <Input value={draft.support_email ?? ""} onChange={(e) => setDraft({ ...draft, support_email: e.target.value })} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Dirección</Label>
              <Input value={draft.support_address ?? ""} onChange={(e) => setDraft({ ...draft, support_address: e.target.value })} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Horario</Label>
              <Input value={draft.support_hours ?? ""} onChange={(e) => setDraft({ ...draft, support_hours: e.target.value })} className="min-h-11 rounded-xl" />
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardTitle icon={MapPin} title="Texto para locales" />
        <div className="space-y-2">
          <Label className="font-semibold">Descripción de compra por local</Label>
          <Textarea value={draft.locations_intro ?? ""} onChange={(e) => setDraft({ ...draft, locations_intro: e.target.value })} className="min-h-[120px] rounded-xl" />
        </div>
      </AdminCard>

      <div className="flex justify-end">
        <Button variant="hero" className="min-h-11 rounded-2xl" onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4" />{loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}

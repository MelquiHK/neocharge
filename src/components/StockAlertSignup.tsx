import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BellRing, Loader2, CheckCircle2, X } from "lucide-react";
import { normalizeCubanPhone, formatCubanPhoneDisplay } from "@/lib/cuban-phone";
import { toast } from "sonner";

interface Props {
  productId: string;
  productName: string;
}

/**
 * "Avísame cuando haya": el cliente deja su WhatsApp y el bot de NeoCharge
 * le escribe cuando el producto vuelve a tener stock.
 * Respeta la preferencia de Ajustes ("nc-notif-stock"): si el usuario
 * desactivó las alertas de stock, el aviso no se muestra.
 */
const STOCK_NOTIF_KEY = "nc-notif-stock";

export function StockAlertSignup({ productId, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Preferencia de Ajustes: sin alertas de stock, no se muestra el aviso.
  let stockNotifOn = true;
  try {
    stockNotifOn = window.localStorage.getItem(STOCK_NOTIF_KEY) !== "0";
  } catch {
    /* sin almacenamiento: se muestra */
  }
  if (!stockNotifOn) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeCubanPhone(phone);
    if (!normalized) {
      toast.error("Revisa el número: usa tu móvil cubano de 8 dígitos (ej: 5842 7265).");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("stock_alerts")
        .insert({ product_id: productId, phone: normalized });
      if (error) {
        // 23505: índice único parcial -> ya tiene una alerta pendiente
        if ((error as { code?: string }).code === "23505") {
          setDone(true);
          toast.info("Ya tienes una alerta activa para este producto.");
        } else {
          throw error;
        }
      } else {
        setDone(true);
        toast.success(`Listo. Te avisaremos al ${formatCubanPhoneDisplay(normalized)} cuando "${productName}" esté disponible.`);
      }
    } catch (err) {
      console.error("[stock_alerts] error al guardar:", err);
      toast.error("No pudimos guardar tu alerta. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="glass rounded-3xl p-4 border-brand-200/60 flex items-center gap-3">
        <span className="nc-icon-tile-sm shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </span>
        <p className="text-sm">
          <span className="font-semibold block">Alerta activada</span>
          <span className="text-muted-foreground">
            Te escribiremos por WhatsApp en cuanto haya stock.
          </span>
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-2xl border-brand-300/70 bg-brand-50/60 hover:bg-brand-100/70 text-brand-800 font-semibold backdrop-blur"
      >
        <BellRing className="w-5 h-5 mr-2" />
        Avísame cuando haya
      </Button>
    );
  }

  return (
    <div className="glass rounded-3xl p-5 border-brand-200/60">
      <div className="flex items-start justify-between mb-1">
        <p className="font-semibold flex items-center gap-2">
          <BellRing className="w-5 h-5 text-brand-600" />
          Avísame cuando haya stock
        </p>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Déjanos tu WhatsApp y te escribimos en cuanto "{productName}" esté disponible.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Tu WhatsApp (ej: 5842 7265)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
          aria-label="Tu número de WhatsApp"
          className="flex-1 min-w-0 h-11 px-4 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur text-base outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200/60 placeholder:text-muted-foreground/70"
        />
        <Button
          type="submit"
          disabled={loading}
          className="h-11 px-5 rounded-2xl nc-btn-shine shrink-0"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Avisarme"}
        </Button>
      </form>
    </div>
  );
}

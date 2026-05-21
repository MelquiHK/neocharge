import { useEffect } from "react";
import { ShieldCheck, Clock, Repeat, MessageCircle, AlertTriangle, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/use-site-settings";

const Garantia = () => {
  const { settings } = useSiteSettings();

  useEffect(() => {
    document.title = "Garantía — NeoCharge";
  }, []);

  return (
    <div className="container-page py-24 max-w-5xl space-y-24">
      <header className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          Transparencia Total
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight">
          Garantía <span className="text-gradient-accent">NeoCharge</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
          {settings.warranty_intro}
        </p>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold">{settings.warranty_chargers_title}</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-elevated p-6 space-y-3">
            <Package className="w-6 h-6 text-primary" />
            <h3 className="font-display font-bold text-lg">{settings.warranty_chargers_title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{settings.warranty_chargers_text}</p>
          </div>

          <div className="card-elevated p-6 space-y-3">
            <Clock className="w-6 h-6 text-accent" />
            <h3 className="font-display font-bold text-lg">24 horas para probar</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si no puedes probar el cargador en el momento (por apagones u otras razones), tienes 24 horas
              para hacerlo. Dentro de ese plazo puedes cambiarlo o pedir la devolución.
            </p>
          </div>

          <div className="card-elevated p-6 space-y-3">
            <Repeat className="w-6 h-6 text-success" />
            <h3 className="font-display font-bold text-lg">Cambio sin costo</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si tu cargador presenta problemas dentro del período de garantía, te lo cambiamos por otro
              sin costo adicional.
            </p>
          </div>

          <div className="card-elevated p-6 space-y-3">
            <MessageCircle className="w-6 h-6 text-primary" />
            <h3 className="font-display font-bold text-lg">Soporte técnico</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Resolvemos cualquier duda por WhatsApp y te ayudamos con la configuración o uso de tu cargador.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-6 flex gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-display font-bold">{settings.warranty_important_title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{settings.warranty_important_text}</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow-accent">
            <Package className="w-5 h-5 text-accent-foreground" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold">{settings.warranty_electronics_title}</h2>
        </div>

        <div className="card-elevated p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">{settings.warranty_electronics_text}</p>
          <div className="rounded-xl bg-muted p-4 border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Estos productos no tienen devolución.</strong> Probamos cada
              equipo frente a ti precisamente para evitar cualquier problema. Una vez aceptado, no aceptamos
              cambios para evitar que daños accidentales o uso indebido se atribuyan al producto original.
            </p>
          </div>
        </div>
      </section>

      <section className="text-center space-y-6 py-8">
        <h2 className="font-display text-2xl font-bold">{settings.warranty_support_title}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">{settings.warranty_support_text}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="hero" size="lg">
            <a href={settings.whatsapp_url ?? "https://wa.me/5363180910"} target="_blank" rel="noreferrer">
              <MessageCircle className="w-5 h-5" /> Escribir por WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to={settings.contact_url ?? "/contacto"}>Ver locales y contacto</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Garantia;

import { useEffect } from "react";
import { ShieldCheck, Clock, Repeat, MessageCircle, AlertTriangle, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Garantia = () => {
  useEffect(() => {
    document.title = "Garantía — Neocharge";
  }, []);

  return (
    <div className="container-page py-16 max-w-4xl space-y-16">
      <header className="text-center space-y-4">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary">
          Compra con confianza
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
          Garantía Neocharge
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Cada producto que sale de nuestros locales se prueba antes de entregarse. Esta es nuestra política
          clara y honesta para que sepas exactamente con qué cuentas.
        </p>
      </header>

      {/* Cargadores de moto eléctrica */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold">Cargadores de moto eléctrica</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-elevated p-6 space-y-3">
            <Package className="w-6 h-6 text-primary" />
            <h3 className="font-display font-bold text-lg">Prueba al momento de la entrega</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Al recibir tu cargador, puedes probarlo en el momento. Si no enciende o presenta algún problema,
              tienes derecho a cambiarlo por otro o pedir la devolución de tu dinero.
            </p>
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
            <h3 className="font-display font-bold">Importante</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No se aceptan devoluciones ni cambios si el cargador presenta daños físicos como partiduras,
              rajaduras en el plástico, señales de golpes, o si se determina que no es uno de los cargadores
              vendidos por Neocharge. El cargador debe estar en las mismas condiciones en que fue entregado.
            </p>
          </div>
        </div>
      </section>

      {/* Productos de electrónica */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow-accent">
            <Package className="w-5 h-5 text-accent-foreground" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold">Productos de electrónica</h2>
        </div>

        <div className="card-elevated p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Los demás productos de electrónica se prueban en el lugar al momento de la entrega. Si vienen
            sellados de fábrica, se entregan en sus condiciones originales y no requieren prueba.
          </p>
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
        <h2 className="font-display text-2xl font-bold">¿Tienes dudas?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Estamos a un mensaje de distancia. Escríbenos por WhatsApp o visítanos en cualquiera de nuestros locales.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="hero" size="lg">
            <a href="https://wa.me/5363180910" target="_blank" rel="noreferrer">
              <MessageCircle className="w-5 h-5" /> Escribir por WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/contacto">Ver locales y contacto</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Garantia;

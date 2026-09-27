import { useReveal } from "@/hooks/use-reveal";
import { Banknote, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: ShieldCheck,
    title: "Garantía real",
    desc: "Los cargadores tienen garantía contra defectos de fábrica y todo producto se prueba frente a ti al momento de la entrega.",
    color: "from-primary to-primary-glow",
  },
  {
    icon: Truck,
    title: "Entrega en La Habana",
    desc: "Mensajería a domicilio en toda la capital. También puedes recoger tu pedido en nuestro punto del Vedado.",
    color: "from-accent to-accent-glow",
  },
  {
    icon: Banknote,
    title: "Pagas al recibir",
    desc: "Sin pagos por adelantado ni enredos: efectivo en USD o CUP cuando el producto está en tus manos.",
    color: "from-primary to-accent",
  },
  {
    icon: MessageCircle,
    title: "Atención por WhatsApp",
    desc: "De 8am a 8pm te atendemos directo por WhatsApp. Te asesoramos para elegir el cargador ideal para tu moto.",
    color: "from-accent to-primary",
  },
];

export function Features() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-12 md:py-16 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-200/70 text-brand-800 border border-brand-400/30 text-xs font-bold uppercase tracking-widest">
            Por qué NeoCharge
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight nc-title-gradient">
            Comprar aquí es sin enredos
          </h2>
          <p className="text-muted-foreground text-lg font-light">
            Precios claros, garantía de verdad y entrega en La Habana. Así de simple.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={cn(
                "group relative p-7 rounded-3xl overflow-hidden glass border-white/70 hover:border-brand-400/60 hover:shadow-glow-brand-sm transition-all duration-500 hover:-translate-y-1.5 nc-shine-hover",
                "reveal",
                visible && "is-visible",
              )}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div
                className="nc-icon-tile-md mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500"
              >
                <f.icon className="w-7 h-7" strokeWidth={2.2} />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

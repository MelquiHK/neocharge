import { useReveal } from "@/hooks/use-reveal";
import { Banknote, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: ShieldCheck,
    title: "Garantía real",
    desc: "Los cargadores tienen garantía contra defectos de fábrica y todo producto se prueba frente a ti al momento de la entrega.",
    color: "from-blue-600 to-blue-400",
  },
  {
    icon: Truck,
    title: "Entrega en La Habana",
    desc: "Mensajería a domicilio en toda la capital. También puedes recoger tu pedido en nuestro punto del Vedado.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: Banknote,
    title: "Pagas al recibir",
    desc: "Sin pagos por adelantado ni enredos: efectivo en USD o CUP cuando el producto está en tus manos.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: MessageCircle,
    title: "Atención por WhatsApp",
    desc: "De 8am a 8pm te atendemos directo por WhatsApp. Te asesoramos para elegir el cargador ideal para tu moto.",
    color: "from-indigo-500 to-blue-500",
  },
];

export function Features() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-12 md:py-16 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12 space-y-4">
          <span className="cr-chip">Por qué NeoCharge</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight text-slate-900">
            Comprar aquí es <span className="cr-shimmer-text">sin enredos</span>
          </h2>
          <p className="text-slate-500 text-lg font-light">
            Precios claros, garantía de verdad y entrega en La Habana. Así de simple.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={cn(
                "group relative p-7 rounded-3xl cr-glass cr-sheen cr-lift",
                "reveal",
                visible && "is-visible",
              )}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-elevated group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500",
                  f.color,
                )}
              >
                <f.icon className="w-7 h-7 text-white" strokeWidth={2.2} />
              </div>
              <h3 className="font-display text-xl font-bold mb-2 text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

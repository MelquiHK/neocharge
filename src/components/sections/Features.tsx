import { Banknote, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";
import "@/components/sections/visual-effects.css";

const features = [
  {
    icon: ShieldCheck,
    title: "Garantía real",
    desc: "Los cargadores tienen garantía contra defectos de fábrica y todo producto se prueba frente a ti al momento de la entrega.",
    color: "from-[#a3e635] to-[#65a30d]",
    iconColor: "text-[#0c0c14]",
  },
  {
    icon: Truck,
    title: "Entrega en La Habana",
    desc: "Mensajería a domicilio en toda la capital. También puedes recoger tu pedido en nuestro punto del Vedado.",
    color: "from-violet-500 to-fuchsia-600",
    iconColor: "text-white",
  },
  {
    icon: Banknote,
    title: "Pagas al recibir",
    desc: "Sin pagos por adelantado ni enredos: efectivo en USD o CUP cuando el producto está en tus manos.",
    color: "from-[#bef264] to-emerald-500",
    iconColor: "text-[#0c0c14]",
  },
  {
    icon: MessageCircle,
    title: "Atención por WhatsApp",
    desc: "De 8am a 8pm te atendemos directo por WhatsApp. Te asesoramos para elegir el cargador ideal para tu moto.",
    color: "from-fuchsia-500 to-violet-500",
    iconColor: "text-white",
  },
];

export function Features() {
  return (
    <section className="py-12 md:py-16 bg-[#08080d]">
      <div className="container-page">
        <Reveal className="text-center max-w-3xl mx-auto mb-10 md:mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 text-lime-200 text-xs font-bold uppercase tracking-widest">
            Por qué NeoCharge
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">
            Comprar aquí es <span className="text-volt-gradient">sin enredos</span>
          </h2>
          <p className="text-slate-400 text-lg font-light">
            Precios claros, garantía de verdad y entrega en La Habana. Así de simple.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div
                className="group relative p-7 h-full rounded-[2rem] overflow-hidden border border-white/15 nc-liquid lift nc-shine-hover"
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-elevated group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500",
                    f.color,
                  )}
                >
                  <f.icon className={cn("w-7 h-7", f.iconColor)} strokeWidth={2.2} />
                </div>
                <h3 className="font-display text-xl font-bold mb-2 text-white">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

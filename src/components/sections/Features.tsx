import { useReveal } from "@/hooks/use-reveal";
import { ShieldCheck, Truck, Zap, HeadphonesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Carga ultrarrápida",
    desc: "Tecnología GaN y PD que carga tus dispositivos hasta 4× más rápido sin sobrecalentarse.",
    color: "from-primary to-primary-glow",
  },
  {
    icon: ShieldCheck,
    title: "Garantía",
    desc: "Todos los productos pasan control de calidad y se prueban frente al cliente al recibirlos. Ademas de que se prueban al cliente.",
    color: "from-accent to-accent-glow",
  },
  {
    icon: Truck,
    title: "Entrega 24 horas",
    desc: "Mensajería a domicilio en toda La Habana. Recogida disponible en nuestro local del Vedado y en todos los demas locales.",
    color: "from-primary to-accent",
  },
  {
    icon: HeadphonesIcon,
    title: "Soporte 24/7",
    desc: "Atención personalizada por WhatsApp en cualquier momento. Resolvemos tus dudas al instante.",
    color: "from-accent to-primary",
  },
];

export function Features() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-24 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Por qué Neocharge
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
            La diferencia se nota <span className="text-gradient">desde el primer uso</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Productos seleccionados con criterio. Servicio que cumple.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={cn(
                "group relative p-7 rounded-3xl bg-card border border-border hover:border-primary/40 hover:shadow-lifted transition-all duration-500 hover:-translate-y-1",
                "reveal",
                visible && "is-visible",
              )}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-elevated group-hover:scale-110 transition-transform duration-500",
                f.color,
              )}>
                <f.icon className="w-7 h-7 text-white" strokeWidth={2.2} />
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

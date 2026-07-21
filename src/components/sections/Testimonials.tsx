import { Star } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    name: "María Rodríguez",
    role: "Vedado, La Habana",
    text: "Pedí un cargador a las 9pm y a las 11am del día siguiente lo tenía en casa.",
    rating: 5,
  },
  {
    name: "Carlos Pérez",
    role: "Centro Habana",
    text: "Lo mejor es que probaron el producto delante mío antes de irse. No he tenido problemas ni nada y yo quemo la moto",
    rating: 5,
  },
  {
    name: "Yanet García",
    role: "Miramar",
    text: "Compre el amplificador de 60w por cada salida, tremenda calidad. 100% recomendado.",
    rating: 5,
  },
];

export function Testimonials() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-32 bg-slate-50/50 dark:bg-slate-900/10 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
            Comunidad NeoCharge
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-bold leading-tight">
            Experiencias <span className="text-gradient-accent">Reales</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <article
              key={i}
              className="p-7 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-elevated transition-all duration-500"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 text-warning fill-current" />
                ))}
              </div>
              <p className="text-foreground leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold shadow-soft">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

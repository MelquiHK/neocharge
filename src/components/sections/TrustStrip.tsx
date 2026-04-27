import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const items = [
  "TecnoHabana",
  "Revolución Digital",
  "Cuba Tech",
  "El Comerciante",
  "Tribuna Digital",
  "Vedado Daily",
];

export function TrustStrip() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-12 border-y border-border bg-secondary/40 reveal", visible && "is-visible")}>
      <div className="container-page">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          + de 10.000 clientes confían en nosotros
        </p>
        <div className="marquee">
          <div className="marquee-track">
            {[...items, ...items].map((it, i) => (
              <div key={i} className="font-display text-xl md:text-2xl font-bold text-muted-foreground/60 whitespace-nowrap">
                {it} <span className="text-primary mx-4">·</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

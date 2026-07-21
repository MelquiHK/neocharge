import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const items = [
  "Bache Cubano",
  "Electrónica Habana",
  "Cuba Tech",
  "Elecpro Habana",
  "Milexa",
  "Habana Tech",
];

export function TrustStrip() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-16 border-y border-border bg-white dark:bg-slate-950 reveal overflow-hidden", visible && "is-visible")}>
      <div className="container-page relative">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <p className="relative text-center text-sm font-bold uppercase tracking-[0.2em] text-primary/60 mb-10">
          Líderes en tecnología para Cuba
        </p>
        <div className="relative marquee">
          <div className="marquee-track">
            {[...items, ...items, ...items].map((it, i) => (
              <div key={i} className="font-display text-2xl md:text-4xl font-black text-slate-200 dark:text-slate-800 hover:text-primary transition-colors duration-500 whitespace-nowrap uppercase italic tracking-tighter">
                {it} <span className="text-primary/20 not-italic mx-8">/</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

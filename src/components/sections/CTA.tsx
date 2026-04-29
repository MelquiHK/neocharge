import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export function CTA() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-24 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-primary p-10 md:p-16 text-center text-primary-foreground shadow-glow">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary-glow/40 blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />

          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05]">
              ¿Listo para sus proyectos?
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed">
              Explora todo el catálogo o escríbenos directo por WhatsApp. Te asesoramos sin compromiso.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button asChild variant="electric" size="xl">
                <Link to="/tienda">
                  Explorar tienda <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="whatsapp" size="xl">
                <a href="https://wa.me/5363180910" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" /> Escribir por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

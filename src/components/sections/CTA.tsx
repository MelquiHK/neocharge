import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export function CTA() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-12 md:py-16 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[2.5rem] cr-glass-strong cr-sheen p-10 md:p-16 lg:p-20 text-center">
          <div className="cr-orb cr-orb-c" aria-hidden />

          <div className="relative max-w-3xl mx-auto space-y-6 md:space-y-7">
            <span className="cr-chip">
              <span className="w-2 h-2 rounded-full bg-emerald-500 cr-pulse-soft" aria-hidden />
              NeoCharge · La Habana
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-bold leading-[1.08] tracking-tight text-slate-900">
              Tu electrónica, <br />
              <span className="cr-shimmer-text">a un mensaje de distancia</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-500 font-light leading-relaxed max-w-2xl mx-auto">
              Explora el catálogo, confirma por WhatsApp y recibe en La Habana. Sin enredos: garantía real
              y pagas en USD o CUP al recibir.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                to="/tienda"
                className="cr-btn inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base"
              >
                Explorar la tienda <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://wa.me/5363180910?text=Hola%2C%20quiero%20asesor%C3%ADa%20sobre%20un%20producto%20de%20NeoCharge"
                target="_blank"
                rel="noopener noreferrer"
                className="cr-btn-ghost inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base"
              >
                <MessageCircle className="w-5 h-5 text-emerald-600" /> WhatsApp directo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

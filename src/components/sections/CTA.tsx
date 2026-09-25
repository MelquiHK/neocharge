import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export function CTA() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-12 md:py-16 bg-slate-50/70 nc-section-wash reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0a1430] via-[#0d1b4d] to-[#070d20] p-10 md:p-16 lg:p-20 text-center text-white shadow-2xl nc-beam-host">
          <div className="nc-beam" aria-hidden />
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div className="absolute -top-40 -right-40 w-[420px] h-[420px] rounded-full bg-blue-500/20 blur-[100px] animate-pulse-glow pointer-events-none" aria-hidden />
          <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full bg-cyan-500/15 blur-[100px] animate-pulse-glow pointer-events-none" style={{ animationDelay: "2s" }} aria-hidden />

          <div className="relative max-w-3xl mx-auto space-y-6 md:space-y-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/25 text-blue-200 text-xs font-bold uppercase tracking-[0.18em]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
              NeoCharge · La Habana
            </div>
            <h2 className="font-display text-4xl md:text-6xl font-bold leading-[1.08] tracking-tight">
              Tu electrónica, <br />
              <span className="nc-text-shimmer">
                a un mensaje de distancia
              </span>
            </h2>
            <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed max-w-2xl mx-auto">
              Explora el catálogo, confirma por WhatsApp y recibe en La Habana. Sin enredos: garantía real
              y pagas en USD o CUP al recibir.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                asChild
                size="xl"
                className="btn-shine bg-white text-slate-950 hover:bg-blue-50 rounded-2xl font-bold shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <Link to="/tienda" className="flex items-center gap-2.5">
                  Explorar la tienda <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="border-white/20 bg-white/5 text-white backdrop-blur-md hover:bg-white/10 hover:border-emerald-400/50 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <a
                  href="https://wa.me/5363180910?text=Hola%2C%20quiero%20asesor%C3%ADa%20sobre%20un%20producto%20de%20NeoCharge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-400" /> WhatsApp directo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

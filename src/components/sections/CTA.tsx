import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export function CTA() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-12 md:py-16 nc-section-wash reveal", visible && "is-visible")}>
      <div className="container-page">
        <div
          className="relative overflow-hidden rounded-[2.5rem] p-10 md:p-16 lg:p-20 text-center text-white shadow-glow-brand border border-white/40 nc-beam-host"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.78), rgba(38,99,242,0.85) 50%, rgba(124,58,237,0.80))",
            backdropFilter: "blur(22px) saturate(1.4)",
            WebkitBackdropFilter: "blur(22px) saturate(1.4)",
          }}
        >
          <div className="nc-beam" aria-hidden />
          <div
            className="absolute inset-0 opacity-[0.10] pointer-events-none"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div className="absolute -top-40 -right-40 w-[420px] h-[420px] rounded-full bg-white/50 blur-[100px] animate-pulse-glow pointer-events-none" aria-hidden />
          <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full bg-brand-100/60 blur-[100px] animate-pulse-glow pointer-events-none" style={{ animationDelay: "2s" }} aria-hidden />

          <div className="relative max-w-3xl mx-auto space-y-6 md:space-y-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 border border-white/40 text-white text-xs font-bold uppercase tracking-[0.18em]" style={{ backdropFilter: "blur(12px)" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              NeoCharge · La Habana
            </div>
            <h2 className="font-display text-4xl md:text-6xl font-bold leading-[1.08] tracking-tight text-white">
              Tu electrónica, <br />
              <span className="bg-gradient-to-r from-brand-200 via-white to-grape-200 bg-clip-text text-transparent">
                a un mensaje de distancia
              </span>
            </h2>
            <p className="text-lg md:text-xl text-blue-100 font-light leading-relaxed max-w-2xl mx-auto">
              Explora el catálogo, confirma por WhatsApp y recibe en La Habana. Sin enredos: garantía real
              y pagas en USD o CUP al recibir.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                asChild
                size="xl"
                className="btn-shine bg-white text-brand-700 hover:bg-blue-50 rounded-2xl font-bold shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <Link to="/tienda" className="flex items-center gap-2.5">
                  Explorar la tienda <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="border-white/40 bg-white/15 text-white backdrop-blur-md hover:bg-white/25 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <a
                  href="https://wa.me/5363180910?text=Hola%2C%20quiero%20asesor%C3%ADa%20sobre%20un%20producto%20de%20NeoCharge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-600" /> WhatsApp directo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

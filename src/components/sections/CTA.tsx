import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export function CTA() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-32 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-12 md:p-24 text-center text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[100px] animate-pulse-glow" />
          <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[100px] animate-pulse-glow" style={{ animationDelay: "2s" }} />

          <div className="relative max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-bold uppercase tracking-widest">
              Únete a nuestra tecnología
            </div>
            <h2 className="font-display text-5xl md:text-7xl font-bold leading-tight tracking-tighter">
                ¿Listo para elevar <br /><span className="text-gradient-accent">tu tecnología?</span>
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 font-light leading-relaxed">
              Descubre por qué cientos de clientes confían en NeoCharge para sus dispositivos. 
              Calidad a un clic de distancia.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center pt-6">
              <Button asChild size="xl" className="bg-white text-slate-900 hover:bg-blue-50 rounded-2xl font-bold shadow-xl transition-all duration-500 hover:scale-105">
                <Link to="/tienda" className="flex items-center gap-3">
                  Ir a la Tienda <ArrowRight className="w-6 h-6" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="border-white/20 bg-white/5 text-white backdrop-blur-md hover:bg-white/10 rounded-2xl transition-all duration-500">
                <a href="https://wa.me/5363180910" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                  <MessageCircle className="w-6 h-6" /> WhatsApp Directo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryCalculator } from "@/components/DeliveryCalculator";
import { useSEO } from "@/hooks/use-seo";
import { Reveal } from "@/components/Reveal";
import "@/components/sections/visual-effects.css";

const CalcularEnvio = () => {
  useSEO("calcular");

  return (
    <div className="relative bg-[#08080d] w-full max-w-full overflow-x-clip">
      {/* Washes de energía */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-[#a3e635]/10 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[30rem] h-[30rem] rounded-full bg-[#8b5cf6]/10 blur-[120px]" />
        <div className="absolute bottom-0 -right-40 w-[30rem] h-[30rem] rounded-full bg-[#d946ef]/10 blur-[120px]" />
      </div>

      <div className="relative container-page py-12 sm:py-16 lg:py-24">
        <Reveal>
          <header className="text-center space-y-4 mb-8 sm:mb-10 rise-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full nc-glass text-lime-300 text-xs font-bold uppercase tracking-widest border border-white/15">
              Envíos en La Habana
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white">
              Calcula tu <span className="text-volt-gradient">envío</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
              Marca tu ubicación en el mapa, descubre cuántos kilómetros son desde
              nuestro local del Vedado y cuánto cuesta la mensajería. Después
              completa tus datos, elige tus productos y confirma tu pedido por
              WhatsApp.
            </p>
          </header>
        </Reveal>

        <Reveal>
          <div className="rounded-[2rem] border border-white/15 nc-liquid nc-sheen p-4 sm:p-6 md:p-10 text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <DeliveryCalculator />
          </div>
        </Reveal>

        {/* Entrelazado: seguir comprando o ir al checkout tras calcular */}
        <Reveal>
          <section className="mt-12 rounded-[2rem] border border-white/15 nc-glass p-8 md:p-10 text-center space-y-4 text-white">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
              ¿Ya sabes cuánto cuesta tu envío?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Explora el catálogo y arma tu pedido, o ve directo al checkout si ya
              elegiste tus productos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                asChild
                size="lg"
                className="rounded-2xl bg-[#a3e635] text-[#0c0c14] hover:bg-[#bef264] font-bold glow-volt"
              >
                <Link to="/tienda">
                  <ShoppingBag className="w-5 h-5" /> Ver productos
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-lime-300"
              >
                <Link to="/checkout">
                  Ir al checkout <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
};

export default CalcularEnvio;

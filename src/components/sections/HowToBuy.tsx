import { Link } from "react-router-dom";
import { ArrowRight, Banknote, MessageCircle, ShieldCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import "@/components/sections/visual-effects.css";

const steps = [
  {
    icon: ShoppingBag,
    title: "Elige tu producto",
    desc: "Explora el catálogo y agrega al carrito lo que necesites: cargadores, audio o piezas.",
  },
  {
    icon: MessageCircle,
    title: "Confirma por WhatsApp",
    desc: "Te contactamos al +53 6318-0910 para confirmar disponibilidad y coordinar la entrega.",
  },
  {
    icon: Banknote,
    title: "Recibe y paga",
    desc: "Te lo llevamos a casa o lo recoges en el Vedado. Lo pruebas frente a ti y pagas en USD o CUP.",
  },
];

export function HowToBuy() {
  return (
    <section className="py-12 md:py-16 bg-[#08080d] nc-section-wash">
      <div className="container-page">
        <Reveal className="text-center max-w-3xl mx-auto mb-10 md:mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 text-lime-200 text-xs font-bold uppercase tracking-widest">
            Compra fácil
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">
            Comprar es <span className="text-volt-gradient">así de simple</span>
          </h2>
          <p className="text-slate-400 text-lg font-light">
            Sin cuentas complicadas ni pagos por adelantado. En tres pasos lo tienes en tus manos.
          </p>
        </Reveal>

        <div className="relative grid md:grid-cols-3 gap-6">
          {/* línea conectora en desktop */}
          <div
            className="hidden md:block absolute top-14 left-[18%] right-[18%] border-t-2 border-dashed border-[#a3e635]/25 pointer-events-none"
            aria-hidden
          />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 110}>
              <div className="relative p-7 h-full rounded-[2rem] overflow-hidden border border-white/15 nc-liquid lift nc-shine-hover">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#a3e635] to-[#8b5cf6] flex items-center justify-center shadow-elevated">
                    <s.icon className="w-7 h-7 text-[#0c0c14]" strokeWidth={2.2} />
                  </div>
                  <span className="font-display text-5xl font-black text-lime-300/15 select-none" aria-hidden>
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold mb-2 text-white">
                  <span className="text-lime-300 font-black mr-2">{i + 1}.</span>
                  {s.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={330}>
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-[2rem] border border-emerald-400/30 bg-emerald-400/10 p-6">
            <span className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-400/15 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <p className="text-[15px] leading-relaxed text-slate-300">
              <strong className="font-bold">Garantía real:</strong> los cargadores tienen garantía contra defectos de
              fábrica y todo producto se prueba frente a ti al momento de la entrega. Lee los detalles en nuestra{" "}
              <Link to="/garantia" className="text-lime-300 font-semibold underline underline-offset-2 hover:no-underline">
                página de garantía
              </Link>
              .
            </p>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="btn-shine bg-[#a3e635] text-[#0c0c14] hover:bg-[#bef264] rounded-2xl font-bold glow-volt hover:-translate-y-0.5 transition-transform duration-300">
              <Link to="/tienda" className="flex items-center gap-2">
                Ver la tienda <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-2xl font-bold border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-emerald-400/50 hover:-translate-y-0.5 transition-all duration-300"
            >
              <a
                href="https://wa.me/5363180910?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20NeoCharge"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" /> Pedir por WhatsApp
              </a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

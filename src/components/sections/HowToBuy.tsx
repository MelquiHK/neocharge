import { Link } from "react-router-dom";
import { ArrowRight, Banknote, MessageCircle, ShieldCheck, ShoppingBag } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

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
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-12 md:py-16 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12 space-y-4">
          <span className="cr-chip">Compra fácil</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight text-slate-900">
            Comprar es <span className="cr-shimmer-text">así de simple</span>
          </h2>
          <p className="text-slate-500 text-lg font-light">
            Sin cuentas complicadas ni pagos por adelantado. En tres pasos lo tienes en tus manos.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-6">
          {/* línea conectora en desktop */}
          <div
            className="hidden md:block absolute top-14 left-[18%] right-[18%] border-t-2 border-dashed border-blue-300/60 pointer-events-none"
            aria-hidden
          />
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                "relative p-7 rounded-3xl cr-glass cr-sheen cr-lift",
                "reveal",
                visible && "is-visible",
              )}
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-elevated">
                  <s.icon className="w-7 h-7 text-white" strokeWidth={2.2} />
                </div>
                <span className="font-display text-5xl font-black text-blue-600/10 select-none" aria-hidden>
                  {i + 1}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold mb-2 text-slate-900">
                <span className="text-blue-600 font-black mr-2">{i + 1}.</span>
                {s.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-3xl cr-glass-soft p-6",
            "reveal",
            visible && "is-visible",
          )}
          style={{ transitionDelay: "330ms" }}
        >
          <span className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <p className="text-[15px] leading-relaxed text-slate-600">
            <strong className="font-bold">Garantía real:</strong> los cargadores tienen garantía contra defectos de
            fábrica y todo producto se prueba frente a ti al momento de la entrega. Lee los detalles en nuestra{" "}
            <Link to="/garantia" className="text-blue-700 font-semibold underline underline-offset-2 hover:no-underline">
              página de garantía
            </Link>
            .
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/tienda"
            className="cr-btn inline-flex items-center justify-center gap-2 px-8 py-4 text-base"
          >
            Ver la tienda <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="https://wa.me/5363180910?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20NeoCharge"
            target="_blank"
            rel="noopener noreferrer"
            className="cr-btn-ghost inline-flex items-center justify-center gap-2 px-8 py-4 text-base"
          >
            <MessageCircle className="w-5 h-5 text-emerald-600" /> Pedir por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

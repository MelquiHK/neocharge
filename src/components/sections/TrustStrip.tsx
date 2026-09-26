import { BadgeCheck, Banknote, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const props = [
  { icon: ShieldCheck, text: "Garantía en productos" },
  { icon: Truck, text: "Entrega en La Habana" },
  { icon: Banknote, text: "Pago en USD o CUP" },
  { icon: MessageCircle, text: "Soporte por WhatsApp" },
  { icon: BadgeCheck, text: "Prueba tu producto al recibirlo" },
];

export function TrustStrip() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden">
      <div className="container-page">
        <Reveal delay={1} className="text-center mb-7">
          <span className="cr-chip">Compra con confianza</span>
        </Reveal>
        <Reveal delay={2}>
          <div className="cr-marquee" aria-label="Ventajas de comprar en NeoCharge">
            <div className="cr-marquee-track items-center">
              {[...props, ...props].map((p, i) => (
                <div
                  key={i}
                  aria-hidden={i >= props.length}
                  className="flex items-center gap-3 whitespace-nowrap group"
                >
                  <span className="w-10 h-10 rounded-2xl cr-glass text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <p.icon className="w-5 h-5" />
                  </span>
                  <span className="font-display text-lg md:text-xl font-bold text-slate-700 uppercase tracking-tight">
                    {p.text}
                  </span>
                  <span className="text-blue-300 mx-2 text-2xl leading-none" aria-hidden>
                    •
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

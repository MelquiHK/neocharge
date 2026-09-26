import { BadgeCheck, Banknote, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import "@/components/sections/visual-effects.css";

const props = [
  { icon: ShieldCheck, text: "Garantía en productos" },
  { icon: Truck, text: "Entrega en La Habana" },
  { icon: Banknote, text: "Pago en USD o CUP" },
  { icon: MessageCircle, text: "Soporte por WhatsApp" },
  { icon: BadgeCheck, text: "Prueba tu producto al recibirlo" },
];

export function TrustStrip() {
  return (
    <section className="py-10 md:py-12 border-b border-white/10 bg-[#08080d] overflow-hidden">
      <div className="container-page">
        <Reveal>
          <p className="text-center mb-7">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 text-lime-200 text-xs font-bold uppercase tracking-[0.22em]">
              Compra con confianza
            </span>
          </p>
        </Reveal>
        <div className="marquee-mask overflow-hidden" aria-label="Ventajas de comprar en NeoCharge">
          <div className="animate-marquee flex w-max items-center gap-12">
            {[...props, ...props].map((p, i) => (
              <div
                key={i}
                aria-hidden={i >= props.length}
                className="flex items-center gap-3 whitespace-nowrap group"
              >
                <span className="w-10 h-10 rounded-2xl bg-[#a3e635]/15 border border-[#a3e635]/30 text-lime-300 flex items-center justify-center group-hover:bg-[#a3e635] group-hover:text-[#0c0c14] transition-colors duration-300">
                  <p.icon className="w-5 h-5" />
                </span>
                <span className="font-display text-lg md:text-xl font-bold text-white uppercase tracking-tight">
                  {p.text}
                </span>
                <span className="text-[#a3e635]/30 mx-2 text-2xl leading-none" aria-hidden>
                  •
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

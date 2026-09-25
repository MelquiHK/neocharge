import { BadgeCheck, Banknote, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const props = [
  { icon: ShieldCheck, text: "Garantía en productos" },
  { icon: Truck, text: "Entrega en La Habana" },
  { icon: Banknote, text: "Pago en USD o CUP" },
  { icon: MessageCircle, text: "Soporte por WhatsApp" },
  { icon: BadgeCheck, text: "Prueba tu producto al recibirlo" },
];

export function TrustStrip() {
  const { ref, visible } = useReveal();
  return (
    <section
      ref={ref}
      className={cn("py-10 md:py-12 border-b border-border bg-white reveal overflow-hidden", visible && "is-visible")}
    >
      <div className="container-page">
        <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-primary/70 mb-7">
          Compra con confianza
        </p>
        <div className="marquee" aria-label="Ventajas de comprar en NeoCharge">
          <div className="marquee-track items-center">
            {[...props, ...props].map((p, i) => (
              <div
                key={i}
                aria-hidden={i >= props.length}
                className="flex items-center gap-3 whitespace-nowrap group"
              >
                <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <p.icon className="w-5 h-5" />
                </span>
                <span className="font-display text-lg md:text-xl font-bold text-slate-700 uppercase tracking-tight">
                  {p.text}
                </span>
                <span className="text-primary/25 mx-2 text-2xl leading-none" aria-hidden>
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

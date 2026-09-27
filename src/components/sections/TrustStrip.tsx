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
      className={cn("py-10 md:py-12 border-b border-slate-900/[0.07] reveal", visible && "is-visible")}
    >
      <div className="container-page">
        <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-brand-700 mb-7">
          Compra con confianza
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {props.map((p) => (
            <li key={p.text} className="flex items-center gap-3">
              <span className="nc-icon-tile-sm">
                <p.icon className="w-5 h-5" />
              </span>
              <span className="font-display text-base md:text-lg font-bold text-slate-700 uppercase tracking-tight">
                {p.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

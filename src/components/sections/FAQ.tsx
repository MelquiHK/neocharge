import { MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "¿Cómo hago para comprar un producto?",
    a: "Es muy fácil. Selecciona el producto que necesitas, agrégalo al carrito, y al momento de pagar elige si quieres recogerlo en nuestro punto del Vedado o recibirlo por mensajería. Recibimos tu pedido y te contactamos por WhatsApp para confirmar.",
  },
  {
    q: "¿Cuáles son las formas de pago?",
    a: "Aceptamos efectivo en USD y CUP. El pago se realiza al momento de recibir el producto, ya sea en el punto de recogida o por mensajería.",
  },
  {
    q: "¿Tienen garantía los productos?",
    a: "Los cargadores de moto eléctrica tienen garantía contra defectos de fábrica. Los demás productos de electrónica se prueban frente a ti al entregarlos. Lee nuestra política completa en la página de Garantía.",
  },
  {
    q: "¿Cuánto tarda en cargar mi batería?",
    a: "Depende de la capacidad de tu batería (Ah) y el amperaje del cargador. Por ejemplo, una batería de 20Ah con un cargador de 5A tarda aproximadamente 4 horas. Con uno de 3A, unas 7 horas.",
  },
  {
    q: "¿Los cargadores funcionan con todas las motos eléctricas?",
    a: "Funcionan con la mayoría de motos eléctricas con baterías de Plomo-Ácido o Gel. NO son compatibles con baterías LiFePO4 (Litio-Ferro-Fosfato). Verifica el voltaje de tu batería (72V o 48V).",
  },
  {
    q: "¿Qué pasa si no sé qué cargador necesito?",
    a: "Escríbenos por WhatsApp con el voltaje y la capacidad de tu batería y te recomendamos el cargador ideal. También puedes visitarnos en nuestro punto del Vedado, llámanos antes de ir.",
  },
  {
    q: "¿Hacen envíos a otras provincias?",
    a: "Por ahora operamos exclusivamente en La Habana, pero estamos trabajando para expandirnos pronto a otras provincias. En cualquier caso, contáctanos y te decimos qué opciones hay.",
  },
  {
    q: "¿Cómo puedo contactarlos?",
    a: "Estamos disponibles por WhatsApp al +53 6318-0910, de 8am a 8pm.",
  },
];

export function FAQ() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-12 md:py-16 bg-white nc-section-wash reveal", visible && "is-visible")}>
      <div className="container-page max-w-4xl">
        <div className="text-center mb-10 md:mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
            Centro de ayuda
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Resolvemos <span className="text-gradient-accent">tus dudas</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className={cn(
                "border border-border bg-card rounded-2xl px-5 hover:border-primary/30 transition-all duration-300 data-[state=open]:border-primary/50 data-[state=open]:shadow-soft",
                "reveal",
                visible && "is-visible",
              )}
              style={{ transitionDelay: `${Math.min(i, 5) * 60}ms` }}
            >
              <AccordionTrigger className="text-left font-display font-semibold text-base py-5 hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">¿Otra duda? Te la resolvemos al momento.</p>
          <Button
            asChild
            size="lg"
            className="btn-shine rounded-2xl font-bold hover:-translate-y-0.5 transition-transform duration-300"
          >
            <a
              href="https://wa.me/5363180910?text=Hola%2C%20tengo%20una%20duda%20sobre%20NeoCharge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" /> Preguntar por WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "¿Cómo hago para comprar un producto?",
    a: "Es muy fácil. Selecciona el producto que necesitas, agrégalo al carrito, y al momento de pagar elige si quieres recogerlo en uno de nuestros locales o recibirlo por mensajería. Recibimos tu pedido directamente en nuestro panel y te contactamos por WhatsApp para confirmar.",
  },
  {
    q: "¿Cuáles son las formas de pago?",
    a: "Aceptamos efectivo en USD, CUP y MLC. También transferencias bancarias. El pago se realiza al momento de recibir el producto, ya sea en el local o por mensajería.",
  },
  {
    q: "¿Tienen garantía los productos?",
    a: "Los cargadores de moto eléctrica tienen garantía contra defectos de fábrica con 24 horas para probar y cambio sin costo. Los demás productos de electrónica se prueban frente a ti al entregarlos. Lee nuestra política completa en la página de Garantía.",
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
    a: "Escríbenos por WhatsApp con el voltaje y capacidad de tu batería y te recomendamos el cargador ideal. También puedes visitarnos en cualquiera de nuestros 4 locales, siempre llamas antes.",
  },
  {
    q: "¿Hacen envíos a otras provincias?",
    a: "Por ahora operamos exclusivamente en La Habana, pero estamos trabajando para expandirnos pronto a otras provincias, en cualquier caso contactenos para decirle.",
  },
  {
    q: "¿Cómo puedo contactarlos?",
    a: "Estamos disponibles por WhatsApp al +53 6318-0910.",
  },
];

export function FAQ() {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} className={cn("py-32 reveal", visible && "is-visible")}>
      <div className="container-page max-w-4xl">
        <div className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
            Centro de Ayuda
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-bold leading-tight">
            Resolvemos <span className="text-gradient-accent">tus dudas</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-border bg-card rounded-2xl px-5 hover:border-primary/30 transition-colors data-[state=open]:border-primary/50 data-[state=open]:shadow-soft"
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
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { FAQ as FAQSection } from "@/components/sections/FAQ";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/use-seo";
import { getWhatsAppLink } from "@/lib/whatsapp";

const FAQ = () => {
  useSEO("faq");

  return (
    <div className="container-page py-12 md:py-16 space-y-10">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </Button>

      <header className="max-w-2xl space-y-3">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary">Ayuda</span>
        <h1 className="font-display text-5xl font-bold">Preguntas frecuentes</h1>
        <p className="text-muted-foreground text-lg">
          Respuestas rápidas sobre compras, envíos, garantía y pagos.
        </p>
      </header>

      <FAQSection />

      {/* Entrelazado: si la duda no está aquí, contacto directo */}
      <section className="rounded-3xl border border-border/60 bg-secondary/40 p-8 md:p-10 text-center space-y-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold">
          ¿No encontraste tu respuesta?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Escríbenos por WhatsApp o visita la página de contacto y te ayudamos
          con tu duda.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild size="lg" className="rounded-full fx-shine">
            <a href={getWhatsAppLink("Hola NeoCharge, tengo una duda")} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5" /> WhatsApp
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/contacto">Ir a contacto</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default FAQ;

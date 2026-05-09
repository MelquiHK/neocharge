import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FAQ as FAQSection } from "@/components/sections/FAQ";
import { Button } from "@/components/ui/button";

const FAQ = () => {
  useEffect(() => {
    document.title = "Preguntas frecuentes — Neocharge";
  }, []);

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
    </div>
  );
};

export default FAQ;


import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const LegalTerms = () => {
  useEffect(() => {
    document.title = "Términos y condiciones — Neocharge";
  }, []);

  return (
    <div className="container-page py-12 md:py-16 space-y-8 max-w-3xl">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </Button>

      <header className="space-y-3">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary">Legales</span>
        <h1 className="font-display text-5xl font-bold">Términos y condiciones</h1>
        <p className="text-muted-foreground">
          Este texto es un borrador. Puedes personalizarlo según tus políticas reales.
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert">
        <h2>1. Compras</h2>
        <p>
          Al realizar un pedido aceptas que la disponibilidad y el precio pueden confirmarse por WhatsApp.
        </p>

        <h2>2. Pagos</h2>
        <p>
          Los métodos de pago disponibles se muestran durante el checkout. La coordinación final se realiza al confirmar el pedido.
        </p>

        <h2>3. Envíos</h2>
        <p>
          La entrega se coordina con el cliente. Los tiempos y costos pueden variar según la zona.
        </p>

        <h2>4. Garantía</h2>
        <p>
          La garantía aplica según el producto y las condiciones indicadas en la página de garantía.
        </p>

        <h2>5. Contacto</h2>
        <p>
          Para dudas o soporte, visita la página de contacto.
        </p>
      </div>
    </div>
  );
};

export default LegalTerms;


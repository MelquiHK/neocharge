import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const LegalPrivacy = () => {
  useEffect(() => {
    document.title = "Política de privacidad — Neocharge";
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
        <h1 className="font-display text-5xl font-bold">Política de privacidad</h1>
        <p className="text-muted-foreground">
          Este texto es un borrador. Puedes personalizarlo según tus prácticas reales.
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert">
        <h2>Datos que recopilamos</h2>
        <p>
          Podemos recopilar información como nombre, teléfono y dirección cuando realizas un pedido.
        </p>

        <h2>Uso de datos</h2>
        <p>
          Usamos tus datos para gestionar pedidos, coordinar entregas y brindar soporte.
        </p>

        <h2>Compartición</h2>
        <p>
          No vendemos tus datos. Solo se comparten cuando es necesario para completar la entrega o el soporte.
        </p>

        <h2>Contacto</h2>
        <p>
          Si quieres modificar o eliminar tu información, contáctanos.
        </p>
      </div>
    </div>
  );
};

export default LegalPrivacy;


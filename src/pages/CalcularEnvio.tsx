import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryCalculator } from "@/components/DeliveryCalculator";
import { useSEO } from "@/hooks/use-seo";

const CalcularEnvio = () => {
  useSEO("calcular");

  return (
    <div className="container-page py-12 sm:py-16 lg:py-24 w-full max-w-full overflow-x-clip">
      <header className="text-center space-y-4 mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full fx-glass text-primary text-xs font-bold uppercase tracking-widest">
          Envíos en La Habana
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Calcula tu <span className="text-gradient-accent">envío</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
          Marca tu ubicación en el mapa, descubre cuántos kilómetros son desde
          nuestro local del Vedado y cuánto cuesta la mensajería. Después
          completa tus datos, elige tus productos y confirma tu pedido por
          WhatsApp.
        </p>
      </header>
      <DeliveryCalculator />

      {/* Entrelazado: seguir comprando o ir al checkout tras calcular */}
      <section className="mt-12 rounded-3xl border border-border/60 bg-secondary/40 p-8 md:p-10 text-center space-y-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold">
          ¿Ya sabes cuánto cuesta tu envío?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Explora el catálogo y arma tu pedido, o ve directo al checkout si ya
          elegiste tus productos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/tienda">
              <ShoppingBag className="w-5 h-5" /> Ver productos
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/checkout">
              Ir al checkout <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CalcularEnvio;

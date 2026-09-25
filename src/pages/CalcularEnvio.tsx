import { useEffect } from "react";
import { DeliveryCalculator } from "@/components/DeliveryCalculator";

const CalcularEnvio = () => {
  useEffect(() => {
    document.title = "Calcular envío — NeoCharge";
  }, []);

  return (
    <div className="container-page py-24">
      <header className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          Envíos en La Habana
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Calcula tu <span className="text-gradient-accent">envío</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
          Marca tu ubicación en el mapa y descubre al instante cuántos kilómetros
          son desde nuestro local del Vedado y cuánto cuesta la mensajería.
        </p>
      </header>
      <DeliveryCalculator />
    </div>
  );
};

export default CalcularEnvio;

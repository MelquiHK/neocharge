import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Search, Truck, Zap } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
    document.title = "Página no encontrada — NeoCharge";
  }, [location.pathname]);

  return (
    <div className="container-page py-20 md:py-28">
      <div className="relative max-w-xl mx-auto text-center space-y-6">
        <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-radial-glow opacity-60" aria-hidden />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest fx-float">
          <Zap className="w-3 h-3" /> Error 404
        </div>

        <div className="font-display font-black leading-none text-gradient-accent fx-gradient-pan text-8xl sm:text-9xl md:text-[10rem]">
          404
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Página sin energía
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-light max-w-md mx-auto">
          Parece que el cable se desconectó. La página que buscas no existe o la movimos de
          lugar.
        </p>

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Button asChild variant="hero" size="lg" className="rounded-full">
            <Link to="/">
              <Home className="w-4 h-4" /> Inicio
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/tienda">
              <Search className="w-4 h-4" /> Tienda
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/calcular-envio">
              <Truck className="w-4 h-4" /> Calcular envío
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary pt-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a la página anterior
        </button>
      </div>
    </div>
  );
};

export default NotFound;

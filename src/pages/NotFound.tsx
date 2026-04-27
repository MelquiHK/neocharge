import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
    document.title = "Página no encontrada — Neocharge";
  }, [location.pathname]);

  return (
    <div className="container-page py-32 text-center space-y-6 max-w-lg">
      <div className="text-[10rem] font-display font-bold leading-none text-gradient">404</div>
      <h1 className="font-display text-3xl font-bold">Página sin energía</h1>
      <p className="text-muted-foreground text-lg">La URL que buscas no existe o se desconectó.</p>
      <div className="flex gap-3 justify-center">
        <Button asChild variant="hero"><Link to="/"><Home className="w-4 h-4" /> Inicio</Link></Button>
        <Button asChild variant="outline"><Link to="/tienda"><Search className="w-4 h-4" /> Tienda</Link></Button>
      </div>
    </div>
  );
};

export default NotFound;

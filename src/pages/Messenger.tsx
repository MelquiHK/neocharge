import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MessengerPanel } from "@/components/MessengerPanel";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronLeft, Map } from "lucide-react";

const MessengerPage = () => {
  const { user, isMensajero, isAdmin, loading } = useAuth();

  useEffect(() => {
    document.title = "Panel de Mensajería — NeoCharge";
  }, []);

  if (loading) return null;

  // Allow messengers, admins and owners
  if (!user || (!isMensajero && !isAdmin)) {
    return <Navigate to="/cuenta" replace />;
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="container-page py-8 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link to="/cuenta">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Volver
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Map className="w-8 h-8 text-primary" />
              Panel de Mensajería
            </h1>
            <p className="text-muted-foreground">Calcula rutas, distancias y precios para tus entregas.</p>
          </div>
        </header>

        <MessengerPanel />
      </div>
    </div>
  );
};

export default MessengerPage;

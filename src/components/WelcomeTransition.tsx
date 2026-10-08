import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/components/sections/visual-effects.css";

export interface WelcomeData {
  to: string;
  title: string;
  subtitle: string;
}

interface WelcomeTransitionProps {
  data: WelcomeData | null;
  onNavigate: (to: string) => void;
  onDone: () => void;
}

/**
 * Animación de bienvenida a pantalla completa.
 *
 * Cuando el cliente toca el icono de la tienda:
 *  1. Un velo malva se despliega con el logo floreciendo (bloom).
 *  2. Aparece el mensaje de bienvenida.
 *  3. Navega al destino (login si es invitado, panel si ya entró).
 *  4. El velo se disuelve.
 *
 * Solo usa transform/opacity para no tumbar el rendimiento en móviles.
 */
export function WelcomeTransition({ data, onNavigate, onDone }: WelcomeTransitionProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setLeaving(false);

    const NAVIGATE_AT = 950;
    const DONE_AT = 1350;

    const t1 = window.setTimeout(() => {
      onNavigate(data.to);
      setLeaving(true);
    }, NAVIGATE_AT);
    const t2 = window.setTimeout(() => {
      onDone();
    }, DONE_AT);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data) return null;

  return (
    <div
      className={cn("nc-welcome-veil", leaving && "nc-welcome-veil--leaving")}
      role="status"
      aria-label={data.title}
    >
      {/* Anillo expansivo */}
      <div className="nc-welcome-ring" aria-hidden />
      <div className="nc-welcome-ring nc-welcome-ring--late" aria-hidden />

      <div className="nc-welcome-core">
        <div className="nc-welcome-logo">
          <Zap className="w-10 h-10 text-white" strokeWidth={2.5} fill="currentColor" />
        </div>
        <p className="nc-welcome-title">{data.title}</p>
        <p className="nc-welcome-subtitle">{data.subtitle}</p>
      </div>
    </div>
  );
}

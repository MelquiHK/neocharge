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
 * Animación de bienvenida ÉPICA a pantalla completa.
 *
 * Cuando el cliente toca el icono de la tienda:
 *  1. Un velo ciruela oscuro se despliega.
 *  2. Triple anillo expansivo + el logo florece con brillo intenso.
 *  3. El título aparece con barrido de brillo.
 *  4. Destello final, navega al destino y el velo se disuelve.
 *
 * Solo usa transform/opacity para no tumbar el rendimiento en móviles.
 */
export function WelcomeTransition({ data, onNavigate, onDone }: WelcomeTransitionProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setLeaving(false);

    const NAVIGATE_AT = 1150;
    const DONE_AT = 1550;

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
      className={cn("nc-welcome-veil nc-welcome-veil--epic", leaving && "nc-welcome-veil--leaving")}
      role="status"
      aria-label={data.title}
    >
      {/* Triple anillo expansivo */}
      <div className="nc-welcome-ring" aria-hidden />
      <div className="nc-welcome-ring nc-welcome-ring--late" aria-hidden />
      <div className="nc-welcome-ring nc-welcome-ring--later" aria-hidden />

      {/* Resplandor central */}
      <div className="nc-welcome-glow" aria-hidden />

      <div className="nc-welcome-core">
        <div className="nc-welcome-logo nc-welcome-logo--epic">
          <Zap className="nc-welcome-zap" strokeWidth={2.5} fill="currentColor" />
        </div>
        <p className="nc-welcome-title nc-welcome-title--epic">
          <span className="nc-welcome-title-shine">{data.title}</span>
        </p>
        <p className="nc-welcome-subtitle nc-welcome-subtitle--epic">{data.subtitle}</p>
      </div>
    </div>
  );
}

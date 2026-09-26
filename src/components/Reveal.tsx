import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "@/components/sections/visual-effects.css";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Retraso en ms antes de animar (para escalonados). */
  delay?: number;
  /** Dirección de entrada. */
  variant?: "up" | "scale" | "left" | "right";
}

/**
 * Envuelve contenido para que aparezca con animación al entrar en viewport.
 * Usa IntersectionObserver; respeta prefers-reduced-motion vía CSS.
 * Solo visual: no toca lógica de negocio.
 */
export function Reveal({ children, className, delay = 0, variant = "up" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const style: CSSProperties = delay > 0 ? { transitionDelay: `${delay}ms` } : {};

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "reveal",
        variant === "scale" && "reveal-scale",
        variant === "left" && "reveal-left",
        variant === "right" && "reveal-right",
        className
      )}
    >
      {children}
    </div>
  );
}

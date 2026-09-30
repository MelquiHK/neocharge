import { Suspense, lazy, useEffect, useRef } from "react";
import { Box, Cuboid } from "lucide-react";

/**
 * Visor 3D del producto con <model-viewer> de Google.
 *
 * - Se carga de forma diferida: el paquete de model-viewer (~1 MB con three.js)
 *   solo se descarga cuando el producto SÍ tiene modelo 3D.
 * - En Android con ARCore muestra el botón de realidad aumentada: el cliente
 *   apunta la cámara a su mesa y ve el producto ahí, a tamaño real.
 * - `poster` muestra la foto del producto mientras carga el modelo.
 * - Si el producto no tiene `modelUrl`, este componente no se renderiza
 *   (la página queda con la galería de fotos normal).
 */

// Declaración del web component para TypeScript.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          poster?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "shadow-intensity"?: string;
          loading?: "auto" | "lazy" | "eager";
          reveal?: "auto" | "interaction" | "manual";
          "touch-action"?: string;
        },
        HTMLElement
      >;
    }
  }
}

const LazyModelViewer = lazy(async () => {
  await import("@google/model-viewer");
  return {
    default: function ModelViewerTag({
      modelUrl,
      poster,
      name,
    }: {
      modelUrl: string;
      poster?: string;
      name: string;
    }) {
      return (
        <model-viewer
          src={modelUrl}
          poster={poster}
          alt={`Modelo 3D de ${name}`}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          shadow-intensity="1"
          loading="lazy"
          reveal="interaction"
          touch-action="pan-y"
          style={{ width: "100%", height: "100%", minHeight: 380 }}
        />
      );
    },
  };
});

interface Model3DViewerProps {
  modelUrl: string;
  poster?: string;
  name: string;
  /** Si viene ?vista=3d en la URL, se hace scroll hasta el visor al cargar. */
  autoFocus?: boolean;
}

export default function Model3DViewer({ modelUrl, poster, name, autoFocus }: Model3DViewerProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (autoFocus) {
      // Esperar a que el lazy chunk cargue antes de hacer scroll.
      const t = window.setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 600);
      return () => window.clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    <section
      ref={sectionRef}
      aria-label="Vista 3D del producto"
      className="rounded-3xl overflow-hidden border border-border bg-gradient-to-b from-muted/60 to-muted/20"
    >
      <div className="flex items-center gap-2 px-5 pt-4 pb-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Cuboid className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Míralo en 3D</h2>
          <p className="text-xs text-muted-foreground">
            Gíralo con el dedo · En Android puedes verlo en tu mesa con la cámara
          </p>
        </div>
      </div>

      <div className="relative aspect-square sm:aspect-[4/3]">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              {poster ? (
                <img
                  src={poster}
                  alt={name}
                  className="max-h-full max-w-full object-contain opacity-60"
                />
              ) : (
                <Box className="h-10 w-10 animate-pulse" />
              )}
              <p className="text-sm">Cargando modelo 3D…</p>
            </div>
          }
        >
          <LazyModelViewer modelUrl={modelUrl} poster={poster} name={name} />
        </Suspense>
      </div>

      <p className="px-5 pb-4 text-xs text-muted-foreground">
        Consejo: toca el icono de realidad aumentada para ver el producto a tamaño
        real sobre tu mesa.
      </p>
    </section>
  );
}

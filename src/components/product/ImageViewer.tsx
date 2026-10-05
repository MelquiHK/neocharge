import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { responsiveImage } from "@/lib/responsive-image";

/**
 * Visor de imágenes a pantalla completa, hecho a medida para NeoCharge.
 *
 * - Pellizco para acercar/alejar (gestos propios con Pointer Events,
 *   `touch-action: none`: el navegador no interfiere ni hace zoom de página)
 * - Arrastrar para mover la foto cuando está ampliada
 * - Doble toque (o doble clic) para alternar zoom 1x <-> 2.5x en ese punto
 * - Deslizar para pasar de foto cuando no hay zoom
 * - Carga progresiva: primero una versión pequeña difuminada, luego la
 *   resolución completa; las fotos vecinas se precargan
 *
 * No usa el zoom del navegador a propósito: la página tiene
 * `user-scalable=no` y el zoom vive solo dentro de este visor.
 */

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD_RATIO = 0.18;
const DOUBLE_TAP_DELAY = 320;
const DOUBLE_TAP_SLOP = 28;

interface Point {
  x: number;
  y: number;
}

export default function ImageViewer({
  images,
  initialIndex = 0,
  alt = "Imagen del producto",
  onClose,
  onIndexChange,
}: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    startDist: number;
    startScale: number;
    startMid: Point; // relativo al centro del contenedor
    startT: Point;
    singleStart: Point; // punto inicial (relativo al centro) para swipe/doble toque
    singleMoved: boolean;
    pinch: boolean;
  } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const stateRef = useRef({ scale, translate });
  stateRef.current = { scale, translate };

  const count = images.length;
  const src = images[index] ?? "";

  // Versión pequeña para el blur-up y versión grande para ver con detalle.
  const small = responsiveImage(src, "100vw").srcSet
    ? variantUrl(src, 400)
    : src;
  const full = variantUrl(src, 1600);

  const goTo = useCallback(
    (next: number) => {
      const wrapped = (next + count) % count;
      setIndex(wrapped);
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      setFullLoaded(false);
      onIndexChange?.(wrapped);
    },
    [count, onIndexChange]
  );

  // Precarga de vecinas: la siguiente y la anterior siempre listas.
  useEffect(() => {
    if (count < 2) return;
    [(index + 1) % count, (index - 1 + count) % count].forEach((i) => {
      const im = new Image();
      im.src = variantUrl(images[i], 1600);
    });
  }, [index, count, images]);

  // Bloquear el scroll de la página mientras el visor está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Teclado: Esc cierra, flechas cambian de foto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo, onClose]);

  const centerOf = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: clientX - (rect ? rect.left + rect.width / 2 : window.innerWidth / 2),
      y: clientY - (rect ? rect.top + rect.height / 2 : window.innerHeight / 2),
    };
  }, []);

  const clampTranslate = useCallback((s: number, t: Point): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    const vw = rect?.width ?? window.innerWidth;
    const vh = rect?.height ?? window.innerHeight;
    // La imagen se muestra con object-contain: nunca excede el contenedor
    // en escala 1, así que el desplazamiento máximo es proporcional.
    const maxX = Math.max(0, (vw * s - vw) / 2);
    const maxY = Math.max(0, (vh * s - vh) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, t.x)),
      y: Math.min(maxY, Math.max(-maxY, t.y)),
    };
  }, []);

  /** Zoom alrededor de un punto (coordenadas relativas al centro). */
  const zoomAt = useCallback(
    (point: Point, targetScale: number, animate = false) => {
      const { scale: s, translate: t } = stateRef.current;
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
      const k = clamped / s;
      const nt = {
        x: point.x - (point.x - t.x) * k,
        y: point.y - (point.y - t.y) * k,
      };
      if (animate) {
        setAnimating(true);
        window.setTimeout(() => setAnimating(false), 220);
      }
      setScale(clamped);
      setTranslate(clampTranslate(clamped, clamped === 1 ? { x: 0, y: 0 } : nt));
    },
    [clampTranslate]
  );

  const handleDoubleTap = useCallback(
    (point: Point) => {
      const { scale: s } = stateRef.current;
      zoomAt(point, s > 1.4 ? 1 : DOUBLE_TAP_SCALE, true);
    },
    [zoomAt]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = centerOf(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const { scale: s, translate: t } = stateRef.current;
      gesture.current = {
        startDist: dist,
        startScale: s,
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        startT: { ...t },
        singleStart: p,
        singleMoved: true,
        pinch: true,
      };
      setAnimating(false);
    } else if (pointers.current.size === 1) {
      gesture.current = {
        startDist: 0,
        startScale: stateRef.current.scale,
        startMid: p,
        startT: { ...stateRef.current.translate },
        singleStart: p,
        singleMoved: false,
        pinch: false,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = centerOf(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;

    if (g.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (g.startDist > 0 && dist > 0) {
        const targetScale = g.startScale * (dist / g.startDist);
        const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
        // Invariante del pellizco: el punto del contenido que estaba bajo el
        // punto medio inicial de los dedos sigue bajo el punto medio actual.
        const k = clamped / g.startScale;
        const nt = {
          x: mid.x - (g.startMid.x - g.startT.x) * k,
          y: mid.y - (g.startMid.y - g.startT.y) * k,
        };
        setScale(clamped);
        setTranslate(clampTranslate(clamped, nt));
      }
      return;
    }

    if (!g.pinch && pointers.current.size === 1) {
      const dx = p.x - g.singleStart.x;
      const dy = p.y - g.singleStart.y;
      if (Math.hypot(dx, dy) > 8) g.singleMoved = true;
      const { scale: s } = stateRef.current;
      if (s > 1) {
        // Mover la foto ampliada.
        setTranslate(clampTranslate(s, { x: g.startT.x + dx, y: g.startT.y + dy }));
      } else {
        // Arrastrar para deslizar entre fotos (con resistencia).
        const resisted = dx * 0.55;
        const clampedY = Math.max(-120, Math.min(120, dy * 0.3));
        setTranslate({ x: resisted, y: clampedY });
      }
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const p = centerOf(e.clientX, e.clientY);
    const hadPointer = pointers.current.delete(e.pointerId);
    const g = gesture.current;

    if (pointers.current.size === 0) {
      if (g && !g.pinch && hadPointer) {
        const { scale: s, translate: t } = stateRef.current;
        const dx = p.x - g.singleStart.x;
        const dy = p.y - g.singleStart.y;
        const rect = containerRef.current?.getBoundingClientRect();
        const vw = rect?.width ?? window.innerWidth;

        if (s === 1 && g.singleMoved) {
          // Fin del desliz: ¿cambiamos de foto o volvemos?
          if (Math.abs(dx) > vw * SWIPE_THRESHOLD_RATIO && Math.abs(dx) > Math.abs(dy) * 1.4) {
            setAnimating(true);
            window.setTimeout(() => setAnimating(false), 200);
            goTo(index + (dx < 0 ? 1 : -1));
          } else {
            setAnimating(true);
            setTranslate({ x: 0, y: 0 });
            window.setTimeout(() => setAnimating(false), 200);
          }
        } else if (s === 1 && !g.singleMoved) {
          // Toque simple: detectar doble toque (en ratón lo maneja onDoubleClick).
          if (e.pointerType === "mouse") return;
          const now = performance.now();
          const last = lastTap.current;
          if (
            last &&
            now - last.time < DOUBLE_TAP_DELAY &&
            Math.hypot(p.x - last.x, p.y - last.y) < DOUBLE_TAP_SLOP
          ) {
            lastTap.current = null;
            handleDoubleTap(p);
          } else {
            lastTap.current = { time: now, x: p.x, y: p.y };
          }
          void t;
        } else if (s > 1) {
          // Al soltar con zoom, recentrar si quedó fuera de rango.
          setTranslate(clampTranslate(s, t));
        }
      }
      gesture.current = null;
    } else if (pointers.current.size === 1) {
      // Pasamos de pellizco a un dedo: reiniciar la base del gesto.
      const [remaining] = [...pointers.current.values()];
      gesture.current = {
        startDist: 0,
        startScale: stateRef.current.scale,
        startMid: remaining,
        startT: { ...stateRef.current.translate },
        singleStart: remaining,
        singleMoved: true,
        pinch: false,
      };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imágenes"
      onClick={(e) => {
        // Tocar el fondo (no la foto) cierra el visor.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Barra superior */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium tabular-nums bg-white/10 rounded-full px-3 py-1">
          {index + 1} / {count}
        </span>
        <button
          onClick={onClose}
          aria-label="Cerrar visor"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Superficie de gestos */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={(e) => handleDoubleTap(centerOf(e.clientX, e.clientY))}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
            transformOrigin: "center center",
            transition: animating ? "transform 200ms ease-out" : "none",
            willChange: "transform",
          }}
        >
          {/* Versión pequeña difuminada (carga al instante) */}
          <img
            src={small}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute max-w-full max-h-full object-contain blur-xl scale-110 opacity-60 pointer-events-none select-none"
          />
          {/* Versión completa (por encima de la difuminada: al ser
              posicionada pinta sobre ella aunque esta cargue después) */}
          <img
            key={src}
            ref={(el) => {
              // Si la imagen ya está en caché, onLoad puede no dispararse:
              // marcarla como cargada de inmediato para no dejar el velo gris.
              if (el && el.complete && el.naturalWidth > 0 && !fullLoaded) {
                setFullLoaded(true);
              }
            }}
            src={full}
            srcSet={responsiveImage(src, "100vw").srcSet}
            sizes="100vw"
            alt={alt}
            draggable={false}
            onLoad={() => setFullLoaded(true)}
            className="relative max-w-full max-h-full object-contain pointer-events-none select-none transition-opacity duration-300"
            style={{ opacity: fullLoaded ? 1 : 0 }}
          />
        </div>
      </div>

      {/* Flechas (escritorio / pantallas grandes) */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(index - 1);
            }}
            aria-label="Foto anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1);
            }}
            aria-label="Foto siguiente"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Miniaturas */}
      {count > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center gap-2 px-4 py-4 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              aria-label={`Ver foto ${i + 1}`}
              className={`h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                i === index ? "border-white scale-105" : "border-transparent opacity-50"
              }`}
            >
              <img
                src={variantUrl(img, 200)}
                alt=""
                draggable={false}
                loading="lazy"
                className="w-full h-full object-cover pointer-events-none"
              />
            </button>
          ))}
        </div>
      )}

      {/* Ayuda contextual */}
      {scale === 1 && (
        <p className="absolute bottom-20 left-0 right-0 z-10 text-center text-white/50 text-xs pointer-events-none">
          Pellizca o toca dos veces para acercar · desliza para ver más fotos
        </p>
      )}
    </div>
  );
}

/** URL de la imagen redimensionada vía el API de transformación de Supabase.
 *  resize=contain es obligatorio: sin él, con solo width Supabase devuelve
 *  (width × alto_original) y la foto se ve recortada/ampliada. */
function variantUrl(url: string, width: number): string {
  const m = url.match(/^(https:\/\/[^/]+\/storage\/v1\/)object\/public\/(.+)$/);
  if (!m) return url;
  return `${m[1]}render/image/public/${m[2]}?width=${width}&quality=80&resize=contain`;
}

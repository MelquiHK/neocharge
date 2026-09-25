/**
 * Efectos visuales premium de NeoCharge ("efecto agua"), 100% CSS y
 * autocontenidos: los keyframes se inyectan una sola vez en <head>.
 *
 * - nc-fly-to-cart: fantasma que vuela al carrito al añadir un producto.
 * - nc-heart-pop: pop del corazón de favoritos.
 * - nc-water-shine: barrido de brillo sutil sobre tarjetas destacadas.
 * - nc-btn-shine: micro-brillo periódico en botones "Añadir al carrito".
 * - nc-rise: entrada suave de ítems (carrito).
 *
 * Rendimiento: solo se animan transform y opacity. Todo respeta
 * prefers-reduced-motion (también en JS para el fly-to-cart).
 */

const STYLE_ID = "nc-fx-style";
const KEYFRAMES = `
@keyframes nc-fly-to-cart {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
    border-radius: 1rem;
  }
  60% {
    opacity: 0.9;
    border-radius: 9999px;
  }
  100% {
    transform: translate(calc(100vw - 56px - var(--nc-from-x, 0px)), calc(24px - var(--nc-from-y, 0px))) scale(0.12);
    opacity: 0;
    border-radius: 9999px;
  }
}
@keyframes nc-heart-pop {
  0% { transform: scale(0.6); }
  45% { transform: scale(1.35); }
  100% { transform: scale(1); }
}
@keyframes nc-shine-sweep {
  0% { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
  12% { opacity: 1; }
  48% { transform: translateX(380%) skewX(-18deg); opacity: 1; }
  62%, 100% { transform: translateX(380%) skewX(-18deg); opacity: 0; }
}
@keyframes nc-rise-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Barrido de brillo "agua" sobre tarjetas destacadas (solo transform/opacity) */
.nc-water-shine { position: relative; }
.nc-water-shine::after {
  content: "";
  position: absolute;
  top: -10%; bottom: -10%; left: 0;
  width: 38%;
  background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,.32) 42%, rgba(255,255,255,.5) 50%, rgba(255,255,255,.32) 58%, transparent 100%);
  transform: translateX(-180%) skewX(-18deg);
  opacity: 0;
  animation: nc-shine-sweep 4.4s ease-in-out infinite;
  pointer-events: none;
  z-index: 6;
}
.dark .nc-water-shine::after {
  background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,.10) 42%, rgba(255,255,255,.18) 50%, rgba(255,255,255,.10) 58%, transparent 100%);
}

/* Micro-brillo en botones "Añadir al carrito" */
.nc-btn-shine { position: relative; overflow: hidden; }
.nc-btn-shine::after {
  content: "";
  position: absolute;
  top: -10%; bottom: -10%; left: 0;
  width: 30%;
  background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,.45) 50%, transparent 100%);
  transform: translateX(-220%) skewX(-18deg);
  opacity: 0;
  animation: nc-shine-sweep 3.8s ease-in-out infinite;
  pointer-events: none;
}

/* Entrada suave de elementos */
.nc-rise { animation: nc-rise-in 0.45s cubic-bezier(.22,.9,.28,1) both; }

@media (prefers-reduced-motion: reduce) {
  .nc-water-shine::after,
  .nc-btn-shine::after { animation: none; display: none; }
  .nc-rise { animation: none; }
}
`;

function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

/** Garantiza que los keyframes decorativos existan en la página. */
export function ensureNcFx() {
  ensureStyle();
}

/**
 * Lanza el fantasma volador desde el elemento origen (normalmente el botón
 * "Añadir al carrito"). No falla si el DOM no está disponible.
 */
export function flyToCart(source: HTMLElement | null, imageUrl?: string | null) {
  if (!source || typeof document === "undefined") return;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    ensureStyle();
    const rect = source.getBoundingClientRect();
    const fromX = rect.left + rect.width / 2;
    const fromY = rect.top + rect.height / 2;

    const ghost = document.createElement("div");
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.cssText = [
      "position: fixed",
      `left: ${fromX}px`,
      `top: ${fromY}px`,
      "width: 72px",
      "height: 72px",
      "z-index: 9999",
      "pointer-events: none",
      "overflow: hidden",
      "box-shadow: 0 12px 32px rgba(0,0,0,.25)",
      `--nc-from-x: ${fromX}px`,
      `--nc-from-y: ${fromY}px`,
      "animation: nc-fly-to-cart 0.85s cubic-bezier(.22,.9,.28,1) forwards",
    ].join(";");

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
      ghost.appendChild(img);
    } else {
      ghost.style.background = "linear-gradient(135deg,#2563eb,#7c3aed)";
    }

    const remove = () => ghost.remove();
    ghost.addEventListener("animationend", remove, { once: true });
    // Seguridad: si el evento no dispara, limpiar igual.
    window.setTimeout(remove, 1200);
    document.body.appendChild(ghost);
  } catch {
    // La animación es decorativa: nunca debe romper el flujo de compra.
  }
}

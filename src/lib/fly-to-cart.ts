/**
 * Efecto "volar al carrito" de NeoCharge, 100% CSS y autocontenido:
 * los keyframes se inyectan una sola vez en <head>.
 *
 * - nc-fly-to-cart: fantasma que vuela al carrito al añadir un producto
 *   (animación funcional y transitoria: solo se dispara al añadir).
 *
 * Los demás acabados (brillos al hover, pop del corazón) viven en
 * src/index.css como reglas estáticas/hover. Nada perpetuo.
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
`;  /* flyToCart() ya no se ejecuta con prefers-reduced-motion (ver abajo) */

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

/**
 * AmbientBackground — fondo blanco pero vivo para toda la tienda.
 *
 * Capas (todas fijas, sin interacción, aria-hidden):
 *  1. Aurora tenue superior (azul → morado) con deriva suave.
 *  2. Blobs de degradado suaves animados (azul, morado, cian).
 *  3. Burbujas flotantes de cristal (glassmorphism real).
 *  4. Patrón de puntos sutil en la zona superior.
 *
 * Rendimiento: solo se animan transform/opacity (GPU). Los blur son
 * estáticos. Todo se apaga con prefers-reduced-motion (ver index.css).
 */
export function AmbientBackground() {
  return (
    <div className="nc-ambient" aria-hidden="true">
      {/* Aurora tenue */}
      <div className="nc-ambient-aurora" />

      {/* Blobs de color suaves */}
      <div
        className="nc-ambient-blob"
        style={{
          width: "44rem",
          height: "44rem",
          left: "-12rem",
          top: "8%",
          background: "radial-gradient(circle, rgba(147,197,253,0.30), transparent 70%)",
        }}
      />
      <div
        className="nc-ambient-blob"
        style={{
          width: "38rem",
          height: "38rem",
          right: "-10rem",
          top: "32%",
          background: "radial-gradient(circle, rgba(196,181,253,0.32), transparent 70%)",
          animationDelay: "-7s",
        }}
      />
      <div
        className="nc-ambient-blob"
        style={{
          width: "40rem",
          height: "40rem",
          left: "22%",
          bottom: "-14rem",
          background: "radial-gradient(circle, rgba(165,243,252,0.30), transparent 70%)",
          animationDelay: "-13s",
        }}
      />
      <div
        className="nc-ambient-blob"
        style={{
          width: "30rem",
          height: "30rem",
          right: "18%",
          bottom: "6%",
          background: "radial-gradient(circle, rgba(221,214,254,0.35), transparent 70%)",
          animationDelay: "-4s",
        }}
      />

      {/* Burbujas de cristal flotantes */}
      <div className="nc-bubble" style={{ width: 92, height: 92, left: "6%", top: "18%" }} />
      <div
        className="nc-bubble nc-bubble-violet"
        style={{ width: 60, height: 60, left: "14%", top: "58%", animationDelay: "-3s" }}
      />
      <div
        className="nc-bubble"
        style={{ width: 128, height: 128, right: "8%", top: "12%", animationDelay: "-5.5s" }}
      />
      <div
        className="nc-bubble nc-bubble-violet"
        style={{ width: 44, height: 44, right: "20%", top: "44%", animationDelay: "-2s" }}
      />
      <div
        className="nc-bubble"
        style={{ width: 70, height: 70, left: "42%", top: "8%", animationDelay: "-8s" }}
      />
      <div
        className="nc-bubble nc-bubble-violet"
        style={{ width: 104, height: 104, left: "3%", bottom: "10%", animationDelay: "-6.5s" }}
      />
      <div
        className="nc-bubble"
        style={{ width: 60, height: 60, right: "34%", bottom: "22%", animationDelay: "-1.2s" }}
      />
      <div
        className="nc-bubble nc-bubble-violet"
        style={{ width: 84, height: 84, right: "5%", bottom: "6%", animationDelay: "-9.5s" }}
      />

      {/* Patrón de puntos sutil */}
      <div className="nc-ambient-dots" />
    </div>
  );
}

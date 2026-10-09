/**
 * SEO Configuration & Meta Tags Manager
 * Provides centralized meta tag management for all pages
 */

export interface MetaTags {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

// Dominio canónico del sitio (usado para URLs absolutas en OG/canonical).
export const SITE_URL = "https://tienda-neocharge.vercel.app";

// SEO configurations for each page
export const seoConfig: Record<string, MetaTags> = {
  home: {
    title: "NeoCharge",
    description:
      "Tu tienda de electrónica de confianza en La Habana. Calidad premium, garantía certificada y entrega en 24h.",
    keywords:
      "electrónica La Habana, cargador USB C, NeoCharge, tecnología Cuba, cargador rápido",
    ogImage: "/images/og-home.jpg",
  },
  shop: {
    title: "Tienda | NeoCharge - Catálogo de Electrónica",
    description:
      "Explora nuestro catálogo de productos electrónicos. Cargadores, cables y accesorios de alta calidad con garantía completa.",
    keywords: "comprar cargador Cuba, accesorios iPhone Habana, cargadores certificados",
    ogImage: "/images/og-shop.jpg",
  },
  productDetail: {
    title: "Producto - NeoCharge",
    description:
      "Descubre los detalles del cargador. Especificaciones técnicas, garantía y envíos.",
  },
  checkout: {
    title: "Finalizar pedido — NeoCharge",
    description:
      "Finaliza tu compra en NeoCharge: paga en USD o CUP y elige mensajería a domicilio o recogida en el local.",
  },
  auth: {
    title: "Iniciar Sesión - NeoCharge",
    description: "Accede a tu cuenta de NeoCharge para gestionar tus pedidos.",
  },
  account: {
    title: "Mi Cuenta - NeoCharge",
    description:
      "Gestiona tu perfil, tus pedidos y tus favoritos en tu cuenta de NeoCharge.",
  },
  settings: {
    title: "Ajustes - NeoCharge",
    description:
      "Personaliza tu experiencia en NeoCharge: ahorro de datos, moneda preferida, perfil y notificaciones.",
  },
  admin: {
    title: "Administración — NeoCharge",
    description:
      "Panel de administración de la tienda NeoCharge: pedidos, productos, tasas y reportes.",
  },
  mensajeria: {
    title: "Panel de mensajería — NeoCharge",
    description:
      "Panel del mensajero NeoCharge: pedidos asignados y rutas de entrega en La Habana.",
  },
  about: {
    title: "Sobre Nosotros - NeoCharge",
    description:
      "Conoce la historia de NeoCharge, nuestra misión y compromiso con la calidad.",
    ogImage: "/images/og-about.jpg",
  },
  contact: {
    title: "Contacto - NeoCharge",
    description: "Ponte en contacto con nosotros. Estamos aquí para ayudarte.",
  },
  blog: {
    title: "Blog - NeoCharge | Consejos y noticias",
    description:
      "Lee nuestros artículos sobre cargadores, tecnología y consejos de uso.",
  },
  blogPost: {
    title: "Artículo - NeoCharge Blog",
    description:
      "Lee el artículo completo en el blog de NeoCharge: consejos sobre cargadores, tecnología y electrónica en Cuba.",
  },
  notFound: {
    title: "Página no encontrada — NeoCharge",
    description:
      "La página que buscas no existe o fue movida. Vuelve a la tienda NeoCharge.",
  },
  descargarApp: {
    title: "Descargar la app — NeoCharge",
    description:
      "Instala la app de NeoCharge en tu Android: compra más rápido, recibe avisos de ofertas y lleva la tienda en tu bolsillo.",
  },
  descargas: {
    title: "Descargas — NeoCharge",
    description:
      "Descarga el APK oficial de la tienda NeoCharge para Android y consulta el historial de versiones.",
  },
  orderConfirmed: {
    title: "Pedido confirmado — NeoCharge",
    description:
      "Tu pedido se registró correctamente. Te contactaremos por WhatsApp para coordinar la entrega.",
  },
  trackOrder: {
    title: "Rastrear pedido — NeoCharge",
    description:
      "Consulta el estado de tu pedido en NeoCharge con tu número de orden o tu teléfono.",
  },
  garantia: {
    title: "Garantía y Envíos - NeoCharge",
    description:
      "Información sobre garantía, envíos y política de devoluciones en NeoCharge.",
  },
  faq: {
    title: "Preguntas Frecuentes - NeoCharge",
    description:
      "Respuestas a las preguntas más comunes sobre nuestros productos y servicios.",
  },
  favorites: {
    title: "Favoritos - NeoCharge",
    description: "Tus productos favoritos en NeoCharge.",
  },
  services: {
    title: "Servicios - NeoCharge",
    description:
      "Servicios de NeoCharge: desarrollo web, mantenimiento de splits, reparaciones y soporte técnico en La Habana.",
  },
  calcular: {
    title: "Calcular envío - NeoCharge",
    description:
      "Calcula el costo de la mensajería desde nuestro local del Vedado hasta tu ubicación en La Habana.",
  },
  comparar: {
    title: "Comparar cargadores - NeoCharge",
    description:
      "Compara los cargadores NeoCharge para baterías de litio: precio, amperaje y tiempo estimado de carga según los Ah de tu batería.",
  },
  legal: {
    title: "Términos y Condiciones - NeoCharge",
    description: "Lee nuestros términos de uso y política de privacidad.",
  },
};

/**
 * Updates the document meta tags based on provided configuration
 */
export function updateMetaTags(config: MetaTags): void {
  // Update title
  if (config.title) {
    document.title = config.title;
    updateMetaTag("og:title", config.ogTitle || config.title);
  }

  // Update description
  if (config.description) {
    updateMetaTag("description", config.description);
    updateMetaTag(
      "og:description",
      config.ogDescription || config.description
    );
  }

  // Update keywords
  if (config.keywords) {
    updateMetaTag("keywords", config.keywords);
  }

  // Update og:image (siempre URL absoluta para que WhatsApp/Facebook la lean bien)
  if (config.ogImage) {
    const absolute = config.ogImage.startsWith("http")
      ? config.ogImage
      : `${SITE_URL}${config.ogImage.startsWith("/") ? "" : "/"}${config.ogImage}`;
    updateMetaTag("og:image", absolute);
  }

  // Canonical + og:url: siempre la URL actual de la página, salvo que la
  // configuración traiga un canonicalUrl explícito. Así ninguna página
  // queda canónica a "/" por olvido.
  const canonical =
    config.canonicalUrl ||
    `${window.location.origin}${window.location.pathname}`;
  updateCanonicalTag(canonical);
  updateMetaTag("og:url", canonical);

  // OJO: el viewport del index.html es deliberado (user-scalable=no
  // documentado para la tienda) — no se toca aquí.
  // Theme-color fijo de marca: el triplete HSL leído de --primary
  // ("319 28% 50%") no es un valor válido para content.
  updateMetaTag("theme-color", "#9e5f8f");
}

/**
 * Helper function to update or create meta tag
 */
function updateMetaTag(name: string, content: string): void {
  let tag = document.querySelector(`meta[name="${name}"]`) ||
    document.querySelector(`meta[property="${name}"]`) || null;

  if (!tag) {
    tag = document.createElement("meta");
    const isProperty = name.startsWith("og:");
    if (isProperty) {
      tag.setAttribute("property", name);
    } else {
      tag.setAttribute("name", name);
    }
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

/**
 * Helper function to update canonical link
 */
function updateCanonicalTag(url: string): void {
  let link = document.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

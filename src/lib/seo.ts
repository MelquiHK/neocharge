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

// SEO configurations for each page
export const seoConfig: Record<string, MetaTags> = {
  home: {
    title: "NeoCargador - Cargadores USB C rápidos y seguros",
    description:
      "Tienda online de cargadores USB C de alta velocidad. Cargadores seguros, confiables y certificados para todos tus dispositivos.",
    keywords:
      "cargador USB C, cargador rápido, cargador seguro, cargadores USB tipo C",
    ogImage: "/images/og-home.jpg",
  },
  shop: {
    title: "Tienda - NeoCargador | Compra cargadores USB C",
    description:
      "Explora nuestra amplia selección de cargadores USB C. Todos certificados y con garantía de calidad.",
    keywords: "comprar cargador, cargadores baratos, cargador USB C barato",
    ogImage: "/images/og-shop.jpg",
  },
  productDetail: {
    title: "Producto - NeoCargador",
    description:
      "Descubre los detalles del cargador. Especificaciones técnicas, garantía y envíos.",
  },
  checkout: {
    title: "Carrito de Compras - NeoCargador",
    description: "Completa tu compra de forma segura en NeoCargador.",
  },
  auth: {
    title: "Iniciar Sesión - NeoCargador",
    description: "Accede a tu cuenta de NeoCargador para gestionar tus pedidos.",
  },
  account: {
    title: "Mi Cuenta - NeoCargador",
    description: "Gestiona tu perfil, pedidos y preferencias en NeoCargador.",
  },
  about: {
    title: "Sobre Nosotros - NeoCargador",
    description:
      "Conoce la historia de NeoCargador, nuestra misión y compromiso con la calidad.",
    ogImage: "/images/og-about.jpg",
  },
  contact: {
    title: "Contacto - NeoCargador",
    description: "Ponte en contacto con nosotros. Estamos aquí para ayudarte.",
  },
  blog: {
    title: "Blog - NeoCargador | Consejos y noticias",
    description:
      "Lee nuestros artículos sobre cargadores, tecnología y consejos de uso.",
  },
  blogPost: {
    title: "Artículo - NeoCargador Blog",
    description: "Descubre los últimos artículos del blog de NeoCargador.",
  },
  garantia: {
    title: "Garantía y Envíos - NeoCargador",
    description:
      "Información sobre garantía, envíos y política de devoluciones en NeoCargador.",
  },
  faq: {
    title: "Preguntas Frecuentes - NeoCargador",
    description:
      "Respuestas a las preguntas más comunes sobre nuestros productos y servicios.",
  },
  legal: {
    title: "Términos y Condiciones - NeoCargador",
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

  // Update og:image
  if (config.ogImage) {
    updateMetaTag("og:image", config.ogImage);
  }

  // Update canonical URL
  if (config.canonicalUrl) {
    updateCanonicalTag(config.canonicalUrl);
  }

  // Add viewport for mobile
  updateMetaTag("viewport", "width=device-width, initial-scale=1");

  // Add theme color
  updateMetaTag(
    "theme-color",
    getComputedStyle(document.documentElement).getPropertyValue(
      "--primary"
    ) || "#000000"
  );
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

/**
 * Generate structured data (JSON-LD) for rich snippets
 */
export function generateStructuredData(type: string, data: Record<string, unknown>): void {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": type,
    ...data,
  });
  document.head.appendChild(script);
}

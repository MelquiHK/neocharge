/**
 * Genera dinámicamente un sitemap.xml para SEO
 * Debe ser llamado desde la raíz de la app o procesado por un build script
 */

export interface SitemapURL {
  url: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/**
 * URLs estáticas del sitemap
 */
export const staticUrls: SitemapURL[] = [
  {
    url: "https://neocharge.vercel.app/",
    changefreq: "weekly",
    priority: 1.0,
  },
  {
    url: "https://neocharge.vercel.app/tienda",
    changefreq: "daily",
    priority: 0.9,
  },
  {
    url: "https://neocharge.vercel.app/sobre-nosotros",
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    url: "https://neocharge.vercel.app/contacto",
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    url: "https://neocharge.vercel.app/blog",
    changefreq: "weekly",
    priority: 0.8,
  },
  {
    url: "https://neocharge.vercel.app/garantia",
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    url: "https://neocharge.vercel.app/preguntas-frecuentes",
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    url: "https://neocharge.vercel.app/legales/terminos",
    changefreq: "yearly",
    priority: 0.3,
  },
  {
    url: "https://neocharge.vercel.app/legales/privacidad",
    changefreq: "yearly",
    priority: 0.3,
  },
];

/**
 * Genera el XML del sitemap
 */
export function generateSitemapXML(urls: SitemapURL[]): string {
  const urlEntries = urls
    .map(
      (url) =>
        `  <url>
    <loc>${escapeXML(url.url)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ""}
    ${url.priority ? `<priority>${url.priority}</priority>` : ""}
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * Escapa caracteres especiales en XML
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Para usar en páginas dinámicas - genera URL apropiada
 */
export async function addDynamicURLs(
  fetchFn: () => Promise<{ slug: string; updatedAt?: string }[]>,
  baseURL: string,
  changefreq: SitemapURL["changefreq"] = "weekly",
  priority: number = 0.7
): Promise<SitemapURL[]> {
  try {
    const items = await fetchFn();
    return items.map((item) => ({
      url: `${baseURL}/${item.slug}`,
      lastmod: item.updatedAt,
      changefreq,
      priority,
    }));
  } catch (error) {
    console.error("Error fetching dynamic URLs:", error);
    return [];
  }
}

import { useEffect } from "react";
import { updateMetaTags, seoConfig, MetaTags } from "@/lib/seo";

/**
 * Hook para gestionar meta tags en cada página
 * @param pageKey - Key del seoConfig (e.g., 'home', 'shop', 'about')
 * @param overrides - Meta tags personalizados para esta página
 */
export function useSEO(
  pageKey: keyof typeof seoConfig,
  overrides?: Partial<MetaTags>
): void {
  useEffect(() => {
    const baseTags = seoConfig[pageKey];
    const mergedTags = {
      ...baseTags,
      ...overrides,
    };

    updateMetaTags(mergedTags);

    // Scroll to top when page loads
    window.scrollTo(0, 0);
  }, [pageKey, overrides]);
}

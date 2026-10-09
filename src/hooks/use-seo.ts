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
  // Los overrides suelen pasarse como objeto inline: se serializan para que
  // el efecto solo se re-ejecute cuando los valores cambian de verdad
  // (y no en cada render por identidad nueva del objeto).
  const overridesKey = JSON.stringify(overrides ?? null);

  useEffect(() => {
    const baseTags = seoConfig[pageKey];
    const mergedTags: MetaTags = {
      ...baseTags,
      ...(overrides ?? {}),
    };

    updateMetaTags(mergedTags);

    // Scroll to top when page loads
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, overridesKey]);
}

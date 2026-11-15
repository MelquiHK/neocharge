import { getSupabase } from "@/integrations/supabase/lazy-client";

/**
 * Búsqueda de productos compartida (sugerencias del Header y futuras
 * superficies). La coincidencia es por PALABRAS, con la misma semántica
 * que la tienda (/tienda): cada palabra de la consulta —sin acentos y
 * sin muletillas— debe aparecer en el nombre/descripción/slug.
 */

export interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  price_cup: number | null;
  extra_cup_per_usd: number | null;
  images: string[] | null;
  stock: number | null;
  is_featured: boolean | null;
  description: string | null;
  warranty_type: string | null;
}

export const normalizeSearchText = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const STOPWORDS = new Set([
  "de", "del", "para", "con", "el", "la", "los", "las",
  "un", "una", "unos", "unas", "y", "o", "en", "a",
]);

export function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(/[^a-z0-9/+.-]+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

export function searchProducts(
  list: SearchProduct[],
  query: string,
  limit = 6,
): SearchProduct[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const scored: { p: SearchProduct; score: number }[] = [];
  for (const p of list) {
    const name = normalizeSearchText(p.name ?? "");
    const haystack = normalizeSearchText(
      `${p.name ?? ""} ${p.description ?? ""} ${p.slug ?? ""}`,
    );
    if (!tokens.every((t) => haystack.includes(t))) continue;
    // Puntaje: coincidencia en el nombre pesa más que en la descripción;
    // que el nombre empiece por la primera palabra, más todavía. Con
    // stock y destacados primero a igualdad de puntaje.
    let score = 0;
    if (tokens.every((t) => name.includes(t))) score += 10;
    if (name.startsWith(tokens[0])) score += 5;
    if (p.is_featured) score += 2;
    if (p.stock != null && p.stock > 0) score += 1;
    scored.push({ p, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.p);
}

/**
 * Índice ligero de productos para sugerencias. Se descarga UNA vez por
 * sesión de página y solo cuando alguien abre el buscador (el Header lo
 * pide bajo demanda): quien nunca busca no paga ni un byte extra. Si la
 * descarga falla, no se cachea el fallo y el próximo intento reintenta.
 */
let indexPromise: Promise<SearchProduct[]> | null = null;

export function loadProductIndex(): Promise<SearchProduct[]> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,slug,price,currency,price_cup,extra_cup_per_usd,images,stock,is_featured,description,warranty_type",
        )
        .eq("is_active", true)
        .order("sort_order")
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as SearchProduct[];
    })();
    indexPromise.catch(() => {
      indexPromise = null;
    });
  }
  return indexPromise;
}

/** Solo para tests: olvida el índice cacheado. */
export function __resetProductIndexCache() {
  indexPromise = null;
}

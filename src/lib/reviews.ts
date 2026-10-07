/**
 * Helpers puros del sistema de reseñas (MEJORA 3).
 * Sin dependencias de red: testeables con vitest.
 */

export interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  verified: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewerProfile {
  id: string;
  full_name?: string | null;
  username?: string | null;
}

export interface RatingBucket {
  stars: number;
  count: number;
  /** % del total de reseñas (0-100), redondeado a 1 decimal */
  pct: number;
}

export interface ReviewStats {
  count: number;
  /** Promedio 1-5 redondeado a 1 decimal; 0 si no hay reseñas */
  average: number;
  /** De 5 a 1 estrella */
  distribution: RatingBucket[];
}

/**
 * Promedio y distribución por estrellas de una lista de reseñas.
 * Ignora ratings fuera de 1-5 (datos corruptos no deben romper la ficha).
 */
export function computeReviewStats(
  reviews: Pick<ReviewRow, "rating">[],
): ReviewStats {
  const ratings = reviews
    .map((r) => Number(r.rating))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);

  const count = ratings.length;
  const average =
    count === 0 ? 0 : Math.round((ratings.reduce((a, b) => a + b, 0) / count) * 10) / 10;

  const distribution: RatingBucket[] = [5, 4, 3, 2, 1].map((stars) => {
    const c = ratings.filter((r) => Math.round(r) === stars).length;
    return {
      stars,
      count: c,
      pct: count === 0 ? 0 : Math.round((c / count) * 1000) / 10,
    };
  });

  return { count, average, distribution };
}

/**
 * Nombre público del autor de una reseña.
 * Nunca expone el email: full_name -> username -> genérico.
 */
export function displayReviewerName(
  profile: ReviewerProfile | null | undefined,
  fallback = "Cliente de NeoCharge",
): string {
  const name = (profile?.full_name ?? profile?.username ?? "").trim();
  return name || fallback;
}

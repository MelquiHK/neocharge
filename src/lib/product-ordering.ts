export interface ProductOrderingItem {
  id: string;
  is_featured?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
  category_name?: string | null;
  price?: number | null;
  currency?: string | null;
  name?: string | null;
  stock?: number | null;
}

/** Los productos sin stock (stock numérico <= 0) van siempre al final. */
function isOutOfStock(item: ProductOrderingItem): boolean {
  return typeof item.stock === "number" && item.stock <= 0;
}

export type ProductSortValue = "manual" | "new" | "old" | "name" | "type" | "price-asc" | "price-desc";

export interface SortOptions {
  /** Fijar destacados arriba (solo para el orden "manual"; al ordenar por
   *  precio/nombre el usuario espera un orden real, no destacados fijos). */
  pinFeatured?: boolean;
  /** Normaliza el precio a una moneda común para comparar (p. ej. CUP→USD).
   *  Sin esto, 3,000 CUP ordena como "más caro" que $1,690 USD. */
  toUsd?: (item: ProductOrderingItem) => number;
}

export function sortProductsForShop<T extends ProductOrderingItem>(
  items: T[],
  sort: ProductSortValue,
  opts: SortOptions = {},
): T[] {
  const list = [...items];
  const pinFeatured = opts.pinFeatured ?? sort === "manual";
  const priceOf = (item: T): number =>
    opts.toUsd ? opts.toUsd(item) : Number(item.price ?? 0);

  list.sort((a, b) => {
    const outA = isOutOfStock(a);
    const outB = isOutOfStock(b);

    if (outA !== outB) {
      return outA ? 1 : -1;
    }

    if (pinFeatured) {
      const featuredA = !!a.is_featured;
      const featuredB = !!b.is_featured;

      if (featuredA !== featuredB) {
        return featuredA ? -1 : 1;
      }
    }

    if (sort === "manual") {
      const orderA = Number(a.sort_order ?? 0);
      const orderB = Number(b.sort_order ?? 0);
      if (orderA !== orderB) return orderA - orderB;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
    }

    if (sort === "new") {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
    }

    if (sort === "old") {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
    }

    if (sort === "type") {
      return (a.category_name ?? "").localeCompare(b.category_name ?? "", "es", { sensitivity: "base" });
    }

    if (sort === "name") {
      return (a.name ?? "").localeCompare(b.name ?? "", "es", { sensitivity: "base" });
    }

    if (sort === "price-asc") {
      const priceA = priceOf(a);
      const priceB = priceOf(b);
      if (priceA !== priceB) return priceA - priceB;
    }

    if (sort === "price-desc") {
      const priceA = priceOf(a);
      const priceB = priceOf(b);
      if (priceA !== priceB) return priceB - priceA;
    }

    return String(a.id).localeCompare(String(b.id));
  });

  return list;
}

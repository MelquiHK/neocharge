export interface ProductOrderingItem {
  id: string;
  is_featured?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
  category_name?: string | null;
  price?: number | null;
  name?: string | null;
}

export type ProductSortValue = "manual" | "new" | "old" | "name" | "type" | "price-asc" | "price-desc";

export function sortProductsForShop<T extends ProductOrderingItem>(items: T[], sort: ProductSortValue): T[] {
  const list = [...items];

  list.sort((a, b) => {
    const featuredA = !!a.is_featured;
    const featuredB = !!b.is_featured;

    if (featuredA !== featuredB) {
      return featuredA ? -1 : 1;
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
      const priceA = Number(a.price ?? 0);
      const priceB = Number(b.price ?? 0);
      if (priceA !== priceB) return priceA - priceB;
    }

    if (sort === "price-desc") {
      const priceA = Number(a.price ?? 0);
      const priceB = Number(b.price ?? 0);
      if (priceA !== priceB) return priceB - priceA;
    }

    return String(a.id).localeCompare(String(b.id));
  });

  return list;
}

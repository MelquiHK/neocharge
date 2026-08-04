export type ProductSort =
  | "default"
  | "new"
  | "old"
  | "price-asc"
  | "price-desc"
  | "name"
  | "category";

export interface SortableProduct {
  id: string;
  name?: string | null;
  price?: number | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
  category_id?: string | null;
  created_at?: string | null;
}

interface CategoryRef {
  id: string;
  name: string;
}

function compareCreatedAtDesc(a: SortableProduct, b: SortableProduct) {
  const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
  const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
  return tb - ta;
}

function compareCreatedAtAsc(a: SortableProduct, b: SortableProduct) {
  const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
  const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
  return ta - tb;
}

function compareSortOrder(a: SortableProduct, b: SortableProduct) {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

function sortWithinGroup<T extends SortableProduct>(
  items: T[],
  sort: ProductSort,
  categories: CategoryRef[],
): T[] {
  const list = [...items];

  switch (sort) {
    case "old":
      list.sort((a, b) => compareCreatedAtAsc(a, b));
      break;
    case "price-asc":
      list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      break;
    case "price-desc":
      list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      break;
    case "name":
      list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"));
      break;
    case "category":
      list.sort((a, b) => {
        const catA = categories.find((c) => c.id === a.category_id)?.name ?? "";
        const catB = categories.find((c) => c.id === b.category_id)?.name ?? "";
        const byCat = catA.localeCompare(catB, "es");
        if (byCat !== 0) return byCat;
        return (a.name ?? "").localeCompare(b.name ?? "", "es");
      });
      break;
    case "new":
      list.sort((a, b) => {
        const byDate = compareCreatedAtDesc(a, b);
        if (byDate !== 0) return byDate;
        return compareSortOrder(a, b);
      });
      break;
    case "default":
    default:
      list.sort((a, b) => {
        const byOrder = compareSortOrder(a, b);
        if (byOrder !== 0) return byOrder;
        return compareCreatedAtDesc(a, b);
      });
      break;
  }

  return list;
}

/** Featured products always first; each group sorted by the selected criteria. */
export function sortProductsForShop<T extends SortableProduct>(
  products: T[],
  sort: ProductSort,
  categories: CategoryRef[] = [],
): T[] {
  const featured = products.filter((p) => p.is_featured);
  const regular = products.filter((p) => !p.is_featured);

  const featuredSort = sort === "default" || sort === "new" ? "default" : sort;
  const regularSort = sort === "default" ? "new" : sort;

  const sortedFeatured = sortWithinGroup(featured, featuredSort, categories);
  const sortedRegular = sortWithinGroup(regular, regularSort, categories);

  return [...sortedFeatured, ...sortedRegular];
}

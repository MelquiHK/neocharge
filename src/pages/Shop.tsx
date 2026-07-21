import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSEO } from "@/hooks/use-seo";
import { useFavorites } from "@/hooks/use-favorites";
import { sortProductsForShop, type ProductSort } from "@/lib/product-sort";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const FAVORITES_SLUG = "favoritos";

const sortOptions = [
  { value: "default", label: "Recomendados (destacados primero)" },
  { value: "new", label: "Más nuevos" },
  { value: "old", label: "Más antiguos" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "name", label: "Nombre (A-Z)" },
  { value: "category", label: "Por categoría" },
] as const;

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<(Product & { category_id: string | null; created_at?: string; sort_order?: number })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ProductSort>("default");
  const { favoriteIds } = useFavorites();

  const activeCat = searchParams.get("cat") ?? "all";
  const isFavoritesView = activeCat === FAVORITES_SLUG;

  useSEO("shop");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        supabase.from("categories").select("id,name,slug").order("sort_order"),
        supabase
          .from("products")
          .select("id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,category_id,currency,price_cup,extra_cup_per_usd,warranty_type,description,sort_order,created_at")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data as Product[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];

    if (isFavoritesView) {
      list = list.filter((p) => favoriteIds.includes(p.id));
    } else if (activeCat !== "all") {
      const cat = categories.find((c) => c.slug === activeCat);
      if (cat) list = list.filter((p) => p.category_id === cat.id);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    return sortProductsForShop(list, sort, categories);
  }, [products, categories, activeCat, search, sort, favoriteIds, isFavoritesView]);

  const activeCategory = categories.find((c) => c.slug === activeCat);
  const isChargerCategory = activeCategory
    ? activeCategory.slug === "cargadores" || activeCategory.name.toLowerCase().includes("cargador")
    : false;

  const setCat = (slug: string) => {
    if (slug === "all") {
      searchParams.delete("cat");
    } else {
      searchParams.set("cat", slug);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="container-page py-12 md:py-20">
      <header className="mb-16 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          Catálogo Premium
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight">
          {isFavoritesView ? (
            <>Tus <span className="text-gradient-accent">favoritos</span></>
          ) : (
            <>Toda nuestra <br /><span className="text-gradient-accent">electrónica</span></>
          )}
        </h1>
        <p className="text-xl text-muted-foreground font-light max-w-3xl leading-relaxed">
          {isFavoritesView
            ? "Los productos que guardaste para comprar después. Los destacados siempre aparecen primero."
            : "Selección exclusiva de productos con garantía certificada y entrega inmediata en toda La Habana. Los productos destacados siempre aparecen al inicio."}
        </p>
      </header>

      <div className="sticky top-24 z-30 mb-8">
        <div className="glass rounded-2xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center shadow-soft">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11 rounded-xl border-0 bg-secondary/60 focus-visible:ring-1"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSort)}
              className="h-11 rounded-xl border-0 bg-secondary/60 px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring min-w-[220px]"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setCat("all")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold transition-all",
            activeCat === "all"
              ? "bg-foreground text-background shadow-soft"
              : "bg-secondary text-foreground hover:bg-muted",
          )}
        >
          Todos
        </button>
        <button
          onClick={() => setCat(FAVORITES_SLUG)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold transition-all inline-flex items-center gap-1.5",
            isFavoritesView
              ? "bg-red-500 text-white shadow-soft"
              : "bg-secondary text-foreground hover:bg-muted",
          )}
        >
          <Heart className={cn("w-3.5 h-3.5", isFavoritesView && "fill-current")} />
          Favoritos{favoriteIds.length > 0 ? ` (${favoriteIds.length})` : ""}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.slug)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all",
              activeCat === c.slug
                ? "bg-foreground text-background shadow-soft"
                : "bg-secondary text-foreground hover:bg-muted",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isChargerCategory && !loading && (
        <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
          La calculadora de compatibilidad sólo aparece en productos de cargadores. Si quieres un cargador ideal, usa esta categoría y valida el modelo que mejor se adapta a tu batería.
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : isFavoritesView && favoriteIds.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-50 mx-auto flex items-center justify-center">
            <Heart className="w-9 h-9 text-red-400" />
          </div>
          <h3 className="font-display text-xl font-bold">Aún no tienes favoritos</h3>
          <p className="text-muted-foreground">Toca el corazón en cualquier producto para guardarlo aquí.</p>
          <Button variant="outline" onClick={() => setCat("all")}>
            Explorar tienda
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center">
            <Search className="w-9 h-9 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-bold">No encontramos productos</h3>
          <p className="text-muted-foreground">Prueba con otra búsqueda o categoría.</p>
          <Button variant="outline" onClick={() => { setSearch(""); setCat("all"); }}>
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopPage;

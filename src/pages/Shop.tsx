import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedFavorites } from "@/hooks/useUnifiedFavorites";
import { sortProductsForShop, type ProductSortValue } from "@/lib/product-ordering";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const sortOptions = [
  { value: "manual", label: "Por defecto" },
  { value: "new", label: "Más nuevos" },
  { value: "old", label: "Más antiguos" },
  { value: "name", label: "Nombre" },
  { value: "type", label: "Tipo" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
] as const;

type Sort = ProductSortValue;

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<(Product & { category_id: string | null; category_name?: string | null; created_at?: string | null })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("manual");

  const { user } = useAuth();
  const { favoriteIds, toggleFavorite, isFavorite } = useUnifiedFavorites();

  const activeCat = searchParams.get("cat") ?? "all";

  useSEO("shop");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        supabase.from("categories").select("id,name,slug").order("sort_order"),
        supabase
          .from("products")
          .select("id,name,slug,description,price,compare_price,images,main_image_index,stock,is_featured,category_id,currency,price_cup,extra_cup_per_usd,warranty_type,created_at,sort_order")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);
      const categoriesById = new Map((catRes.data ?? []).map((cat) => [cat.id, cat.name]));
      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts((prodRes.data as any).map((item: any) => ({
        ...item,
        category_name: categoriesById.get(item.category_id ?? "") ?? null,
      })));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
      if (activeCat === "favorites") {
        list = list.filter((p) => isFavorite(p.id));
      } else if (activeCat !== "all") {
        const cat = categories.find((c) => c.slug === activeCat);
        if (cat) list = list.filter((p) => p.category_id === cat.id);
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((p) => (p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) ?? false);
      }
      return sortProductsForShop(list, sort);
    }, [products, categories, activeCat, search, sort, favoriteIds]);

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === activeCat),
    [categories, activeCat],
  );

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
          Toda nuestra <br /><span className="text-gradient-accent">electrónica</span>
        </h1>
        <p className="text-xl text-muted-foreground font-light max-w-3xl leading-relaxed">
          Selección exclusiva de productos con garantía certificada y entrega inmediata en toda La Habana. <br className="hidden md:block" />
          Encuentra la energía y tecnología que tu dispositivo necesita.
        </p>
      </header>

      {/* Filters bar */}
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
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-11 rounded-xl border-0 bg-secondary/60 px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category pills */}
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
        {user && (
          <button
            onClick={() => setCat("favorites")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all",
              activeCat === "favorites"
                ? "bg-foreground text-background shadow-soft"
                : "bg-secondary text-foreground hover:bg-muted",
            )}
          >
            Favoritos
          </button>
        )}
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

      {/* Grid */}
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
            <ProductCard
              key={p.id}
              product={p}
              isFavorite={isFavorite(p.id)}
              onToggleFavorite={() => toggleFavorite(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopPage;

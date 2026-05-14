import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSEO } from "@/hooks/use-seo";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const sortOptions = [
  { value: "new", label: "Más nuevos" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "name", label: "Nombre" },
] as const;

type Sort = (typeof sortOptions)[number]["value"];

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<(Product & { category_id: string | null })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("new");

  const activeCat = searchParams.get("cat") ?? "all";

  useSEO("shop");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        supabase.from("categories").select("id,name,slug").order("sort_order"),
        supabase
          .from("products")
          .select("id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,category_id,currency,price_cup,extra_cup_per_usd,warranty_type")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data as any);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCat !== "all") {
      const cat = categories.find((c) => c.slug === activeCat);
      if (cat) list = list.filter((p) => p.category_id === cat.id);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => (p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) ?? false);
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-desc":
        list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "name":
        list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        break;
    }
    return list;
  }, [products, categories, activeCat, search, sort]);

  const setCat = (slug: string) => {
    if (slug === "all") {
      searchParams.delete("cat");
    } else {
      searchParams.set("cat", slug);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="container-page py-12">
      <header className="mb-10 space-y-4">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary">
          Catálogo
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
          Toda nuestra <span className="text-gradient">electrónica</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Productos seleccionados con criterio. Calidad real, precios justos.
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
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopPage;

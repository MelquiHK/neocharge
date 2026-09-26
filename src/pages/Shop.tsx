import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, MessageCircle, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { displayCategoryName } from "@/lib/format";
import { ensureNcFx } from "@/lib/fly-to-cart";
import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/hooks/use-auth";
import { useUnifiedFavorites } from "@/hooks/useUnifiedFavorites";
import { sortProductsForShop, type ProductSortValue } from "@/lib/product-ordering";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { Reveal } from "@/components/Reveal";
import "@/components/sections/visual-effects.css";

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

/** Skeleton elegante con pulso sobre el tema VOLT oscuro. */
function ProductCardSkeleton() {
  return (
    <div
      aria-hidden
      className="rounded-[1.5rem] overflow-hidden bg-[#0d0d16] border border-white/10 flex flex-col"
    >
      <div className="aspect-square animate-pulse bg-white/10" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="h-5 rounded-lg bg-white/10 animate-pulse w-11/12" />
        <div className="h-5 rounded-lg bg-white/10 animate-pulse w-2/3" />
        <div className="mt-auto space-y-2">
          <div className="h-6 rounded-lg bg-white/10 animate-pulse w-1/3" />
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

const emptySuggestions = ["Cargador 72V", "Audífonos", "72V/5A"];

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<(Product & { category_id: string | null; category_name?: string | null; created_at?: string | null })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("manual");

  const { user } = useAuth();
  const { toggleFavorite, isFavorite } = useUnifiedFavorites();

  const activeCat = searchParams.get("cat") ?? "all";

  useSEO("shop");

  useEffect(() => {
    ensureNcFx();
  }, []);

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
      if (prodRes.data) setProducts((prodRes.data as Product[]).map((item: Product) => ({
        ...item,
        category_id: item.category_id ?? "",
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
    }, [products, categories, activeCat, search, sort, isFavorite]);

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
    <div className="relative bg-[#08080d] text-slate-200 min-h-screen overflow-hidden">
      {/* Decoración VOLT */}
      <div className="nc-wash-a pointer-events-none" aria-hidden />
      <div className="nc-wash-b pointer-events-none" aria-hidden />
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-violet-600/20 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />
      <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-fuchsia-500/10 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full bg-lime-400/10 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />

      <div className="container-page py-12 md:py-20 relative z-10">
        <Reveal>
          <header className="mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a3e635]/10 text-lime-300 border border-[#a3e635]/30 text-xs font-bold uppercase tracking-widest">
              Catálogo Premium
            </div>
            <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight text-white">
              Toda nuestra <br /><span className="text-volt-gradient">electrónica</span>
            </h1>
            <p className="text-xl text-slate-400 font-light max-w-3xl leading-relaxed">
              Selección exclusiva de productos con garantía certificada y entrega inmediata en toda La Habana. <br className="hidden md:block" />
              Encuentra la energía y tecnología que tu dispositivo necesita.
            </p>
          </header>
        </Reveal>

        {/* Filters bar */}
        <Reveal delay={80}>
          <div className="sticky top-24 z-40 mb-8">
            <div className="rounded-2xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-11 h-11 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#a3e635]"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-white/10"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-11 rounded-xl bg-white/10 border border-white/20 text-white px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#a3e635] [&>option]:bg-[#0d0d16]"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Category pills */}
        <Reveal delay={140}>
          <div className="flex flex-wrap gap-2 mb-10">
            <button
              onClick={() => setCat("all")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                activeCat === "all"
                  ? "bg-[#a3e635] text-[#0c0c14] font-bold shadow-lg shadow-lime-400/20"
                  : "bg-white/10 border border-white/15 text-slate-300 hover:bg-white/20 hover:text-white",
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
                    ? "bg-[#a3e635] text-[#0c0c14] font-bold shadow-lg shadow-lime-400/20"
                    : "bg-white/10 border border-white/15 text-slate-300 hover:bg-white/20 hover:text-white",
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
                    ? "bg-[#a3e635] text-[#0c0c14] font-bold shadow-lg shadow-lime-400/20"
                    : "bg-white/10 border border-white/15 text-slate-300 hover:bg-white/20 hover:text-white",
                )}
              >
                {displayCategoryName(c.name)}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Grid */}
        {isChargerCategory && !loading && (
          <div className="mb-6 rounded-3xl border border-[#a3e635]/30 bg-[#a3e635]/5 p-4 text-sm text-lime-200/90">
            La calculadora de compatibilidad sólo aparece en productos de cargadores. Si quieres un cargador ideal, usa esta categoría y valida el modelo que mejor se adapta a tu batería.
          </div>
        )}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-label="Cargando productos">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 -m-3 rounded-full bg-gradient-to-br from-lime-400/25 via-fuchsia-500/15 to-transparent blur-2xl" aria-hidden />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-white/10 to-white/5 mx-auto flex items-center justify-center border border-white/10 shadow-2xl shadow-black/40">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
            </div>
            <h3 className="font-display text-2xl font-bold text-white">No encontramos productos</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Prueba con otra búsqueda o categoría. Esto es lo que más buscan nuestros clientes:
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-1">
              {emptySuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSearch(s); setCat("all"); }}
                  className="px-4 py-1.5 rounded-full text-sm font-medium bg-white/10 border border-white/15 text-slate-300 hover:bg-[#a3e635] hover:text-[#0c0c14] hover:border-transparent transition-colors inline-flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" /> {s}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => { setSearch(""); setCat("all"); }}>
                Limpiar filtros
              </Button>
              <Button asChild>
                <a href={getWhatsAppLink("Hola NeoCharge, estoy buscando un producto")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" /> Preguntar por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p, i) => (
              <Reveal key={p.id} className="h-full" delay={(i % 8) * 70}>
                <ProductCard
                  product={p}
                  isFavorite={isFavorite(p.id)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;

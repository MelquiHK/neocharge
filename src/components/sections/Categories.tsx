import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Headphones, MessageCircle } from "lucide-react";
import { getSupabase } from "@/integrations/supabase/lazy-client";
import { fetchWithCache, CACHE_KEYS } from "@/lib/offline-cache";
import { responsiveImage } from "@/lib/responsive-image";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

interface Cat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const countLabel = (n: number) => (n === 1 ? "1 producto" : `${n} productos`);

export function Categories() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { ref, visible } = useReveal();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = await getSupabase();
      // Offline: categorías y portadas salen del caché / semilla local.
      const [{ data: c }, { data: p }] = await Promise.all([
        fetchWithCache(CACHE_KEYS.categories, () =>
          supabase.from("categories").select("id,name,slug,description").order("sort_order")
            .then(r => { if (r.error) throw r.error; return r.data; })
        ),
        fetchWithCache(CACHE_KEYS.products, () =>
          supabase.from("products").select("id,images,main_image_index,category_id").eq("is_active", true)
            .then(r => { if (r.error) throw r.error; return r.data; })
        ),
      ]);
      if (cancelled) return;
      if (c) setCats(c as Cat[]);

      const coverMap: Record<string, string> = {};
      const countMap: Record<string, number> = {};
      for (const prod of (p ?? []) as { id: string; images: unknown; main_image_index: number | null; category_id: string | null }[]) {
        if (!prod.category_id) continue;
        countMap[prod.category_id] = (countMap[prod.category_id] ?? 0) + 1;
        if (coverMap[prod.category_id]) continue;
        const imgs = Array.isArray(prod.images)
          ? (prod.images as unknown[]).filter((u): u is string => typeof u === "string" && u.length > 0)
          : [];
        const img = imgs[prod.main_image_index ?? 0] ?? imgs[0];
        if (img) coverMap[prod.category_id] = img;
      }
      setCovers(coverMap);
      setCounts(countMap);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section ref={ref} className={cn("py-12 md:py-16 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-200/70 text-brand-800 border border-brand-400/30 text-xs font-bold uppercase tracking-widest">
            Explora por categorías
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight nc-title-gradient">
            Encuentra exactamente lo que necesitas
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cats.map((c, i) => {
            const cover = covers[c.id];
            const n = counts[c.id] ?? 0;
            const empty = n === 0;
            const card = cn(
              "group relative aspect-[4/5] rounded-3xl overflow-hidden shadow-elevated hover:shadow-lifted transition-all duration-500 hover:-translate-y-1.5 nc-shine-hover",
              "reveal",
              visible && "is-visible",
            );
            const body = (
              <>
                {cover && !empty
                  ? (() => {
                      const ri = responsiveImage(cover, "(max-width: 640px) 50vw, 25vw");
                      return (
                        <img
                          src={ri.src}
                          srcSet={ri.srcSet}
                          sizes={ri.sizes}
                          alt={c.name}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      );
                    })()
                  : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-200 via-brand-300 to-brand-400 flex items-center justify-center">
                    <Headphones className="w-20 h-20 text-brand-700/40 group-hover:text-brand-600/60 group-hover:scale-110 transition-all duration-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
                  <div className="rounded-2xl border border-white/25 nc-liquid p-4">
                  <span
                    className={cn(
                      "self-start mb-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                      empty ? "bg-amber-400/90 text-slate-950" : "bg-white/15 text-white backdrop-blur-sm border border-white/20",
                    )}
                  >
                    {empty ? "Sin stock por el momento" : countLabel(n)}
                  </span>
                  <h3 className="font-display text-2xl font-bold mb-1 transition-transform duration-500 group-hover:-translate-y-1">
                    {c.name}
                  </h3>
                  {c.description && <p className="text-sm text-white/75 line-clamp-2 mb-2.5">{c.description}</p>}
                  {empty ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                      <MessageCircle className="w-4 h-4" /> Te avisamos cuando lleguen
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                      Ver productos <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                  </div>
                </div>
              </>
            );

            return empty ? (
              <a
                key={c.id}
                href={`https://wa.me/5363180910?text=${encodeURIComponent(`Hola, me avisan cuando tengan ${c.name} disponibles?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={card}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {body}
              </a>
            ) : (
              <Link
                key={c.id}
                to={`/tienda?cat=${c.slug}`}
                className={card}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {body}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

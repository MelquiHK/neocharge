import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "@/components/Reveal";
import "@/components/sections/visual-effects.css";

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,currency,price_cup,extra_cup_per_usd,warranty_type")
        .eq("is_active", true)
        .eq("is_featured", true)
        .limit(8);
      if (!cancelled) {
        if (data) setProducts(data as Product[]);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-12 md:py-16 bg-[#08080d]">
      <div className="container-page">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-12">
          <Reveal className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 text-lime-200 text-xs font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-300 animate-pulse" />
              Nuestros productos
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">
              Productos <span className="text-volt-gradient">destacados</span>
            </h2>
            <p className="text-slate-400 text-lg font-light">
              Cargadores, audio y piezas con garantía, listos para entrega en La Habana.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <Button asChild variant="outline" className="self-start md:self-end rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-[#a3e635]/40 hover:-translate-y-0.5 transition-all duration-300">
              <Link to="/tienda" className="flex items-center gap-2">
                Ver todo <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </Reveal>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-3xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Reveal>
            <div className="rounded-[2rem] border border-white/15 nc-liquid p-12 text-center">
              <p className="font-display text-2xl font-bold text-white">Estamos actualizando el catálogo</p>
              <p className="text-slate-400 mt-2">
                Escríbenos por WhatsApp al +53 6318-0910 y te mostramos lo disponible hoy.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={i * 90} className="h-full [&>*]:h-full">
                <div className="h-full [&>*]:h-full relative overflow-hidden rounded-3xl nc-shine-hover">
                  <ProductCard product={p} />
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

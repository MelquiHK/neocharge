import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, visible } = useReveal();

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
    <section ref={ref} className={cn("py-12 md:py-16 bg-white reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-12">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Nuestros productos
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              Productos <span className="text-gradient-accent">destacados</span>
            </h2>
            <p className="text-muted-foreground text-lg font-light">
              Cargadores, audio y piezas con garantía, listos para entrega en La Habana.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start md:self-end rounded-xl hover:-translate-y-0.5 transition-transform duration-300">
            <Link to="/tienda" className="flex items-center gap-2">
              Ver todo <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-12 text-center">
            <p className="font-display text-2xl font-bold">Estamos actualizando el catálogo</p>
            <p className="text-muted-foreground mt-2">
              Escríbenos por WhatsApp al +53 6318-0910 y te mostramos lo disponible hoy.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {products.map((p, i) => (
              <div
                key={p.id}
                className={cn("h-full [&>*]:h-full relative overflow-hidden rounded-3xl nc-shine-hover reveal", visible && "is-visible")}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

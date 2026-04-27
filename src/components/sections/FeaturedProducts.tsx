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
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,currency,price_cup,extra_cup_per_usd,warranty_type")
        .eq("is_active", true)
        .eq("is_featured", true)
        .limit(8);
      if (data) setProducts(data as Product[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section ref={ref} className={cn("py-24 bg-secondary/30 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary">
              Bestsellers
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              Lo más comprado <span className="text-gradient">este mes</span>
            </h2>
          </div>
          <Button asChild variant="outline" className="self-start md:self-end">
            <Link to="/tienda">
              Ver todo <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

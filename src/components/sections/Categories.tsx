import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

interface Cat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const colors = [
  "from-primary/80 to-primary",
  "from-accent/80 to-accent",
  "from-primary/70 to-accent/70",
  "from-accent/70 to-primary/70",
];

export function Categories() {
  const [cats, setCats] = useState<Cat[]>([]);
  const { ref, visible } = useReveal();

  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name,slug,description")
      .order("sort_order")
      .then(({ data }) => data && setCats(data));
  }, []);

  return (
    <section ref={ref} className={cn("py-32 reveal", visible && "is-visible")}>
      <div className="container-page">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
            Explora por Categorías
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-bold leading-tight">
            Encuentra exactamente <br /><span className="text-gradient-accent">lo que necesitas</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cats.map((c, i) => (
            <Link
              key={c.id}
              to={`/tienda?cat=${c.slug}`}
              className={cn(
                "group relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br shadow-elevated hover:shadow-lifted transition-all duration-500 hover:-translate-y-1",
                colors[i % colors.length],
              )}
            >
              <div className="absolute inset-0 bg-grid opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                <h3 className="font-display text-2xl font-bold mb-1.5 transition-transform duration-500 group-hover:-translate-y-1">
                  {c.name}
                </h3>
                <p className="text-sm text-white/80 line-clamp-2 mb-3">{c.description}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                  Ver productos <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { useEffect } from "react";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  images?: string[] | null;
  created_at: string;
}

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO("blog");

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,image_url,images,created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPosts(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-3xl mb-16 space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          NeoCharge Blog
        </div>
        <h1 className="font-display text-6xl font-bold tracking-tight">Novedades, guías <br /><span className="text-gradient-accent">y soluciones</span></h1>
        <p className="text-xl text-muted-foreground font-light">Aprende a sacarle el máximo partido a tus dispositivos con consejos de expertos.</p>
      </header>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-32 space-y-6 max-w-lg mx-auto">
          <div className="text-6xl">📝</div>
          <div className="space-y-2">
            <p className="font-display text-3xl font-bold">Blog en construcción</p>
            <p className="text-muted-foreground">Pronto compartiremos guías, noticias y consejos sobre electrónica.</p>
          </div>
          <a href="/tienda" className="inline-block mt-4 text-primary hover:underline font-semibold">Ver tienda →</a>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((p) => (
            <Link
              key={p.id}
              to={`/blog/${p.slug}`}
              className="card-elevated overflow-hidden group block hover:shadow-lifted transition-shadow"
            >
              {(p.image_url || (Array.isArray(p.images) && p.images[0])) && (
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  <img
                    src={p.image_url ?? p.images?.[0] ?? ""}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              )}
              <div className="p-6 space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> {new Date(p.created_at).toLocaleDateString("es-CU")}
                </p>
                <h2 className="font-display text-xl font-bold leading-tight group-hover:text-primary transition-colors">{p.title}</h2>
                {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog;

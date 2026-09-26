import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Calendar, ChevronLeft, ShoppingBag, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeArticleContent, renderMarkdown } from "@/lib/markdown";
import { Button } from "@/components/ui/button";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  images?: string[] | null;
  created_at: string;
};

/**
 * Portada de respaldo elegante para artículos sin imagen:
 * gradiente de marca con motivo de rayo y el título, nunca un cuadro gris.
 */
export function PostCoverFallback({
  title,
  className = "aspect-[16/9]",
}: {
  title: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      role="img"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-primary/80 to-accent/70 fx-gradient-pan" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-accent/30 blur-3xl" />
      <Zap
        className="absolute right-6 top-1/2 -translate-y-1/2 w-24 h-24 text-white/15"
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          <Zap className="w-3 h-3" /> NeoCharge Blog
        </span>
        <p className="font-display text-xl md:text-2xl font-bold text-white leading-tight line-clamp-2">
          {title}
        </p>
      </div>
    </div>
  );
}

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const images = useMemo(() => {
    const fromArray = Array.isArray(post?.images) ? post!.images!.filter(Boolean) : [];
    const cover = post?.image_url ? [post.image_url] : [];
    const uniq = Array.from(new Set([...cover, ...fromArray]));
    return uniq;
  }, [post]);

  const html = useMemo(
    () => (post?.content ? renderMarkdown(normalizeArticleContent(post.content)) : ""),
    [post?.content]
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("id,title,slug,excerpt,content,image_url,images,created_at")
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error("BlogPost error:", error);
          if (error.code !== "PGRST116") {
            setPost(null);
          }
        } else {
          const current = (data as Post | null) ?? null;
          setPost(current);
          // Artículos relacionados: otros publicados, los más recientes.
          if (current) {
            const { data: rel } = await supabase
              .from("blog_posts")
              .select("id,title,slug,excerpt,image_url,created_at")
              .eq("is_published", true)
              .neq("id", current.id)
              .order("created_at", { ascending: false })
              .limit(3);
            if (!cancelled) setRelated((rel as Post[] | null) ?? []);
          }
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("BlogPost catch:", err);
        setPost(null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (post?.title) document.title = `${post.title} — Blog — NeoCharge`;
    else document.title = "Blog — NeoCharge";
  }, [post?.title]);

  if (loading) {
    return (
      <div className="container-page py-20">
        <div className="max-w-3xl space-y-6 animate-pulse">
          <div className="h-4 w-32 rounded-full bg-muted" />
          <div className="h-12 w-full rounded-2xl bg-muted" />
          <div className="aspect-[16/9] rounded-3xl bg-muted" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-11/12 rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container-page py-20 text-center space-y-4">
        <p className="font-display text-3xl font-bold">Artículo no encontrado</p>
        <p className="text-muted-foreground">
          El artículo que buscas no existe o ya no está publicado.
        </p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al blog
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-12 md:py-16">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Volver al blog
      </Link>

      <header className="max-w-3xl space-y-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />{" "}
          {new Date(post.created_at).toLocaleDateString("es-CU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight">
          {post.title}
        </h1>
        {post.excerpt && <p className="text-muted-foreground text-lg">{post.excerpt}</p>}
      </header>

      <div className="mt-10 rounded-3xl overflow-hidden border border-border/60 shadow-soft">
        {images.length > 0 ? (
          <>
            <div className="aspect-[16/9] bg-secondary">
              <img
                src={images[0]}
                alt={post.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 p-4 bg-card">
                {images.slice(1).map((src) => (
                  <div
                    key={src}
                    className="aspect-square rounded-2xl overflow-hidden bg-secondary"
                  >
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <PostCoverFallback title={post.title} />
        )}
      </div>

      <article className="mt-10 prose prose-neutral dark:prose-invert max-w-3xl prose-headings:font-display prose-headings:tracking-tight prose-strong:text-foreground prose-li:marker:text-primary prose-ol:space-y-4 prose-ul:space-y-2 prose-li:leading-relaxed">
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-muted-foreground">Este artículo aún no tiene contenido.</p>
        )}
      </article>

      {/* Entrelazado: artículos relacionados + CTA a la tienda */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">Sigue leyendo</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((r) => (
              <Link
                key={r.id}
                to={`/blog/${r.slug}`}
                className="group rounded-3xl border border-border/60 overflow-hidden bg-card hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-lifted"
              >
                {r.image_url ? (
                  <div className="aspect-[16/9] overflow-hidden bg-secondary">
                    <img
                      src={r.image_url}
                      alt={r.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                ) : (
                  <PostCoverFallback
                    title={r.title}
                    className="aspect-[16/9] group-hover:scale-[1.02] transition-transform duration-700"
                  />
                )}
                <div className="p-5">
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {r.title}
                  </h3>
                  {r.excerpt && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {r.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 rounded-3xl border border-border/60 bg-secondary/40 p-8 md:p-10 text-center space-y-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold">¿Te gustó el artículo?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Ponlo en práctica con nuestros productos: cargadores y accesorios con garantía
          certificada.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/tienda">
              <ShoppingBag className="w-5 h-5" /> Ver la tienda
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/blog">
              Más artículos <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default BlogPost;

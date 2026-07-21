import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { renderMarkdown } from "@/lib/markdown";

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


const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const images = useMemo(() => {
    const fromArray = Array.isArray(post?.images) ? post!.images!.filter(Boolean) : [];
    const cover = post?.image_url ? [post.image_url] : [];
    const uniq = Array.from(new Set([...cover, ...fromArray]));
    return uniq;
  }, [post]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,content,image_url,images,created_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("BlogPost error:", error);
          if (error.code !== "PGRST116") {
            setPost(null);
          }
        } else {
          setPost((data as Post | null) ?? null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("BlogPost catch:", err);
        setPost(null);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (post?.title) document.title = `${post.title} — Blog — NeoCharge`;
    else document.title = "Blog — NeoCharge";
  }, [post?.title]);

  if (loading) {
    return <div className="container-page py-20 text-center text-muted-foreground">Cargando artículo…</div>;
  }

  if (!post) {
    return (
      <div className="container-page py-20 text-center space-y-4">
        <p className="font-display text-3xl font-bold">Artículo no encontrado</p>
        <Link to="/blog" className="inline-flex items-center gap-2 text-primary font-semibold">
          <ChevronLeft className="w-4 h-4" /> Volver al blog
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-12 md:py-16">
      <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
        <ChevronLeft className="w-4 h-4" /> Volver al blog
      </Link>

      <header className="max-w-3xl space-y-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString("es-CU")}
        </p>
        <h1 className="font-display text-5xl font-bold leading-tight">{post.title}</h1>
        {post.excerpt && <p className="text-muted-foreground text-lg">{post.excerpt}</p>}
      </header>

      {images.length > 0 && (
        <div className="mt-10 space-y-4">
          <div className="aspect-[16/9] rounded-3xl overflow-hidden bg-secondary">
            <img src={images[0]} alt={post.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {images.slice(1).map((src) => (
                <div key={src} className="aspect-square rounded-2xl overflow-hidden bg-secondary">
                  <img src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <article className="mt-10 prose prose-neutral dark:prose-invert max-w-3xl">
        {post.content ? (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        ) : (
          <p className="text-muted-foreground">Este artículo aún no tiene contenido.</p>
        )}
      </article>
    </div>
  );
};

export default BlogPost;


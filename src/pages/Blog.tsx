import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";

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
  const [newPost, setNewPost] = useState<Post | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });
  const lastSeenPostIdRef = useRef<string | null>(null);

  useSEO("blog");

  const handleEnableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      new Notification("📝 Notificaciones activadas", {
        body: "Recibirás avisos cuando haya artículos nuevos en el blog.",
        icon: "/images/logo.png",
      });
    }
  };

  const notifyNewPost = (article: Post) => {
    if (!article?.id) return;
    if (lastSeenPostIdRef.current && lastSeenPostIdRef.current === article.id) return;

    setPosts((prev) => (prev.some((post) => post.id === article.id) ? prev : [article, ...prev]));

    const lastSeenId = window.localStorage.getItem("neocharge-blog-last-seen");
    if (!lastSeenId || lastSeenId !== article.id) {
      setNewPost(article);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('📝 Nuevo artículo en NeoCharge', {
        body: article.title,
        icon: '/images/logo.png',
        tag: `blog-${article.id}`,
      });
      notification.onclick = () => {
        window.open(`/blog/${article.slug}`, "_blank");
      };
    }
  };

  useEffect(() => {
    const loadPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,image_url,images,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data) {
        setPosts(data as Post[]);
        const latest = data[0];
        const lastSeenId = window.localStorage.getItem("neocharge-blog-last-seen");

        if (latest) {
          lastSeenPostIdRef.current = latest.id;
          if (lastSeenId && latest.id !== lastSeenId) {
            setNewPost(latest);
          } else if (!lastSeenId) {
            window.localStorage.setItem("neocharge-blog-last-seen", latest.id);
          }
        }
      }
      setLoading(false);
    };

    void loadPosts();
  }, []);

  useEffect(() => {
    if (!newPost) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('📝 Nuevo artículo en NeoCharge', {
        body: newPost.title,
        icon: '/images/logo.png',
        tag: `blog-${newPost.id}`,
      });
      notification.onclick = () => {
        window.open(`/blog/${newPost.slug}`, "_blank");
      };
    }
  }, [newPost]);

  useEffect(() => {
    const handleBlogPublished = (event: Event) => {
      const customEvent = event as CustomEvent<{ post?: Post }>;
      if (customEvent.detail?.post) {
        notifyNewPost(customEvent.detail.post);
      }
    };

    window.addEventListener('neocharge:blog-published', handleBlogPublished as EventListener);

    const channel = supabase
      .channel('blog-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blog_posts',
        },
        (payload: any) => {
          const newArticle = payload.new as Post | undefined;
          if (!newArticle?.is_published) return;
          notifyNewPost(newArticle as Post);
        }
      );

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('Blog realtime subscription status:', status);
      }
    });

    const intervalId = window.setInterval(async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,image_url,images,created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      const latest = data?.[0] as Post | undefined;
      if (latest && latest.id !== lastSeenPostIdRef.current) {
        notifyNewPost(latest);
        lastSeenPostIdRef.current = latest.id;
      }
    }, 15000);

    return () => {
      window.removeEventListener('neocharge:blog-published', handleBlogPublished as EventListener);
      window.clearInterval(intervalId);
      channel.unsubscribe();
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  return (
    <div className="container-page py-12 md:py-16">
      {notificationPermission !== "granted" && (
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Recibe avisos del blog</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {notificationPermission === "unsupported"
                  ? "Este navegador no admite notificaciones web."
                  : notificationPermission === "denied"
                    ? "Las notificaciones están bloqueadas. Puedes activarlas desde la configuración del navegador para recibir novedades."
                    : "Activa las notificaciones para enterarte enseguida de nuevos artículos."}
              </p>
            </div>
            {notificationPermission !== "unsupported" && (
              <button
                type="button"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                onClick={() => {
                  void handleEnableNotifications();
                }}
              >
                {notificationPermission === "denied" ? "Reintentar" : "Activar notificaciones"}
              </button>
            )}
          </div>
        </div>
      )}

      <header className="max-w-3xl mb-16 space-y-5">
        {newPost && (
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">Nuevo artículo disponible</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{newPost.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/blog/${newPost.slug}`}
                  onClick={() => window.localStorage.setItem("neocharge-blog-last-seen", newPost.id)}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Leer ahora
                </Link>
                <button
                  type="button"
                  className="rounded-full border border-current px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => {
                    window.localStorage.setItem("neocharge-blog-last-seen", newPost.id);
                    setNewPost(null);
                  }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="rounded-full border border-current px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => {
                    void handleEnableNotifications();
                  }}
                >
                  {notificationPermission === "granted" ? "Notificaciones activadas" : "Activar notificaciones"}
                </button>
              </div>
            </div>
          </div>
        )}
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

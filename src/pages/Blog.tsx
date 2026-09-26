import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, Calendar, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { showBrowserNotification } from "@/lib/notifications";
import { PostCoverFallback } from "@/pages/BlogPost";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  images?: string[] | null;
  is_published?: boolean | null;
  created_at: string;
}

const NOTIF_DISMISSED_KEY = "neocharge-blog-notif-dismissed";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function PostCover({ post, className }: { post: Post; className: string }) {
  const src = post.image_url ?? (Array.isArray(post.images) ? post.images[0] : undefined);
  if (!src) return <PostCoverFallback title={post.title} className={className} />;
  return (
    <div className={`overflow-hidden bg-secondary ${className}`}>
      <img
        src={src}
        alt={post.title}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      />
    </div>
  );
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
  const [notifDismissed, setNotifDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(NOTIF_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const lastSeenPostIdRef = useRef<string | null>(null);

  useSEO("blog");

  const dismissNotifBanner = () => {
    setNotifDismissed(true);
    try {
      window.localStorage.setItem(NOTIF_DISMISSED_KEY, "1");
    } catch {
      /* almacenamiento no disponible */
    }
  };

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
      await showBrowserNotification("📝 Notificaciones activadas", {
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

    void showBrowserNotification("📝 Nuevo artículo en NeoCharge", {
      body: article.title,
      icon: "/images/logo.png",
      tag: `blog-${article.id}`,
      onclick: () => {
        window.open(`/blog/${article.slug}`, "_blank");
      },
    });
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
    void showBrowserNotification("📝 Nuevo artículo en NeoCharge", {
      body: newPost.title,
      icon: "/images/logo.png",
      tag: `blog-${newPost.id}`,
      onclick: () => {
        window.open(`/blog/${newPost.slug}`, "_blank");
      },
    });
  }, [newPost]);

  useEffect(() => {
    const handleBlogPublished = (event: Event) => {
      const customEvent = event as CustomEvent<{ post?: Post }>;
      if (customEvent.detail?.post) {
        notifyNewPost(customEvent.detail.post);
      }
    };

    window.addEventListener("neocharge:blog-published", handleBlogPublished as EventListener);

    const channel = supabase
      .channel("blog-posts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "blog_posts",
        },
        (payload) => {
          const newArticle = payload.new as Post | undefined;
          if (!newArticle?.is_published) return;
          notifyNewPost(newArticle as Post);
        }
      );

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        console.warn("Blog realtime subscription status:", status);
      }
    });

    const intervalId = window.setInterval(async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,image_url,images,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(5);

      const latest = data?.[0] as Post | undefined;
      if (latest && latest.id !== lastSeenPostIdRef.current) {
        notifyNewPost(latest);
        lastSeenPostIdRef.current = latest.id;
      }
    }, 15000);

    return () => {
      window.removeEventListener("neocharge:blog-published", handleBlogPublished as EventListener);
      window.clearInterval(intervalId);
      channel.unsubscribe();
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  const [featured, ...rest] = posts;

  return (
    <div className="container-page py-12 md:py-16">
      {/* Tira discreta de avisos: una línea, se puede cerrar */}
      {notificationPermission !== "granted" && !notifDismissed && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-2.5 text-sm shadow-soft backdrop-blur">
          <Bell className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <p className="flex-1 text-muted-foreground truncate">
            <span className="font-semibold text-foreground">Avisos del blog.</span>{" "}
            <span className="hidden sm:inline">
              Entérate cuando publiquemos una guía nueva.
            </span>
          </p>
          {notificationPermission !== "unsupported" && (
            <button
              type="button"
              onClick={() => void handleEnableNotifications()}
              className="shrink-0 text-sm font-semibold text-primary hover:underline"
            >
              Activar
            </button>
          )}
          <button
            type="button"
            onClick={dismissNotifBanner}
            aria-label="Ocultar aviso"
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header className="max-w-3xl mb-12 md:mb-16 space-y-5">
        {newPost && (
          <div className="rounded-3xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Nuevo artículo disponible</p>
                  <p className="text-sm text-muted-foreground">{newPost.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/blog/${newPost.slug}`}
                  onClick={() =>
                    window.localStorage.setItem("neocharge-blog-last-seen", newPost.id)
                  }
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Leer ahora
                </Link>
                <button
                  type="button"
                  className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  onClick={() => {
                    window.localStorage.setItem("neocharge-blog-last-seen", newPost.id);
                    setNewPost(null);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          NeoCharge Blog
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight">
          Novedades, guías <br />
          <span className="text-gradient-accent">y soluciones</span>
        </h1>
        <p className="text-xl text-muted-foreground font-light">
          Aprende a sacarle el máximo partido a tus dispositivos con consejos de expertos.
        </p>
      </header>

      {loading ? (
        <div className="space-y-6">
          <div className="aspect-[16/8] bg-muted animate-pulse rounded-3xl" />
          <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-3xl" />
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-32 space-y-6 max-w-lg mx-auto">
          <div className="text-6xl">📝</div>
          <div className="space-y-2">
            <p className="font-display text-3xl font-bold">Blog en construcción</p>
            <p className="text-muted-foreground">
              Pronto compartiremos guías, noticias y consejos sobre electrónica.
            </p>
          </div>
          <Link
            to="/tienda"
            className="inline-block mt-4 text-primary hover:underline font-semibold"
          >
            Ver tienda →
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Artículo destacado */}
          {featured && (
            <section aria-label="Artículo destacado">
              <Link
                to={`/blog/${featured.slug}`}
                className="group grid md:grid-cols-2 card-elevated overflow-hidden fx-shine"
              >
                <PostCover post={featured} className="aspect-[16/10] md:aspect-auto md:min-h-[320px]" />
                <div className="p-8 md:p-10 flex flex-col justify-center space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-widest">
                      <Sparkles className="w-3 h-3" /> Destacado
                    </span>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> {formatDate(featured.created_at)}
                    </p>
                  </div>
                  <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight tracking-tight group-hover:text-primary transition-colors">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="text-muted-foreground leading-relaxed line-clamp-3">
                      {featured.excerpt}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-2 text-primary font-semibold pt-1">
                    Leer el artículo
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            </section>
          )}

          {/* Resto de artículos */}
          {rest.length > 0 && (
            <section aria-label="Más artículos" className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="font-display text-2xl font-bold">Más artículos</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                {rest.map((p) => (
                  <Link
                    key={p.id}
                    to={`/blog/${p.slug}`}
                    className="card-elevated overflow-hidden group"
                  >
                    <PostCover post={p} className="aspect-[16/9]" />
                    <div className="p-6 space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {formatDate(p.created_at)}
                      </p>
                      <h3 className="font-display text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                        {p.title}
                      </h3>
                      {p.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold pt-1">
                        Leer <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Cierre editorial: el blog crece */}
          <section className="rounded-3xl border border-dashed border-border bg-secondary/30 p-8 md:p-10 text-center space-y-3">
            <p className="font-display text-xl font-bold">Seguimos escribiendo</p>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Publicamos guías prácticas sobre cargadores, baterías y electrónica. Mientras
              tanto, puedes ver el catálogo o escribirnos por WhatsApp con tus dudas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to="/tienda"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Ver la tienda <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contacto"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Haznos una pregunta
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Blog;

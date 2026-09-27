import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, ShieldCheck, Star, Truck, Zap, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

interface SpotlightProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string | null;
  images: unknown;
  main_image_index: number | null;
}

/** El 72V/5A es el más vendido de la tienda: se prioriza como protagonista del hero. */
const BEST_SELLER_SLUG = "cargador-de-72v-5a";

/** Onda periódica (periodo 720u): el -50% del slide equivale a 2 ondas exactas. */
const WAVE_PATH =
  "M0 64 C120 96 240 96 360 64 C480 32 600 32 720 64 C840 96 960 96 1080 64 C1200 32 1320 32 1440 64 C1560 96 1680 96 1800 64 C1920 32 2040 32 2160 64 C2280 96 2400 96 2520 64 C2640 32 2760 32 2880 64 L2880 120 L0 120 Z";

export function Hero() {
  const [spotlight, setSpotlight] = useState<SpotlightProduct | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [featuredRes, countRes] = await Promise.all([
          supabase
            .from("products")
            .select("id,name,slug,price,currency,images,main_image_index")
            .eq("is_active", true)
            .eq("is_featured", true)
            .limit(8),
          supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);
        if (cancelled) return;
        const featured = (featuredRes.data ?? []) as SpotlightProduct[];
        setSpotlight(featured.find((p) => p.slug === BEST_SELLER_SLUG) ?? featured[0] ?? null);
        if (typeof countRes.count === "number") setProductCount(countRes.count);
      } catch {
        /* el hero funciona igual sin los datos en vivo */
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const images = Array.isArray(spotlight?.images)
    ? (spotlight.images as string[]).filter((u) => typeof u === "string")
    : [];
  const spotlightImage = images[spotlight?.main_image_index ?? 0] ?? images[0];
  const isBestSeller = spotlight?.slug === BEST_SELLER_SLUG;

  const stats = [
    { value: productCount !== null ? String(productCount) : "···", label: "Productos disponibles" },
    { value: "24/7", label: "Atención por WhatsApp" },
    { value: "USD · CUP", label: "Pagas al recibir" },
  ];

  return (
    <section className="relative overflow-hidden text-slate-900">
      {/* Fondo: lavados azules sobre el pastel del body + retícula sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-100/70 via-transparent to-transparent" aria-hidden />
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] bg-brand-400/30 rounded-full filter blur-3xl animate-blob pointer-events-none" aria-hidden />
      <div className="absolute -bottom-40 -left-32 w-[26rem] h-[26rem] bg-brand-300/25 rounded-full filter blur-3xl animate-blob animation-delay-2000 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-radial-glow opacity-60 pointer-events-none" aria-hidden />
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />

      <div className="container-page relative pt-14 pb-20 md:pt-20 md:pb-28 lg:pt-24">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-14 lg:gap-10 items-center">
          {/* Columna izquierda: mensaje */}
          <div className="space-y-8 animate-fade-in-up max-w-2xl">
            <span className="nc-eyebrow">
              <span className="nc-eyebrow-dot" />
              Tienda de electrónica · La Habana
            </span>

            <div className="space-y-5">
              <h1 className="nc-display-xl">
                <span className="block text-slate-950">Energía para tu moto.</span>
                <span className="block nc-title-premium pb-2">
                  Confianza para ti.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed font-light">
                Cargadores para motos eléctricas, audio y piezas con garantía real.
                Entrega a domicilio en La Habana y pagas en USD o CUP cuando el
                producto está en tus manos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="xl"
                className="btn-shine group bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white font-bold rounded-2xl shadow-glow-brand-sm hover:shadow-glow-brand hover:brightness-[1.03] transition-all duration-300 hover:-translate-y-0.5 text-base px-8"
              >
                <Link to="/tienda" className="flex items-center gap-2.5">
                  Explorar la tienda
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="glass text-slate-900 hover:border-brand-400/60 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 text-base px-8 font-semibold"
              >
                <a
                  href="https://wa.me/5363180910"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                  WhatsApp directo
                </a>
              </Button>
            </div>

            {/* Stats con números en degradado azul */}
            <dl className="grid grid-cols-3 gap-6 pt-7 border-t border-slate-900/10">
              {stats.map((stat, i) => (
                <div key={stat.label} className="animate-fade-in-up" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                  <dd className="text-2xl md:text-[2rem] font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
                    {stat.value}
                  </dd>
                  <dt className="text-xs md:text-sm text-slate-500 font-medium mt-1.5">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Columna derecha: producto protagonista en tarjeta de cristal */}
          <div className="relative animate-fade-in-right" style={{ animationDelay: "0.25s" }}>
            <div className="absolute -inset-8 bg-brand-400/25 blur-3xl rounded-full pointer-events-none" aria-hidden />
            <div className="nc-card-premium p-4 sm:p-5">
              <div className="relative overflow-hidden rounded-3xl aspect-[4/3] bg-brand-100/70 nc-ripple">
                {spotlightImage ? (
                  <img
                    src={spotlightImage}
                    alt={spotlight?.name ?? "Producto destacado de NeoCharge"}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-brand-100/80 to-brand-200/80" aria-hidden />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/50 via-transparent to-transparent pointer-events-none" aria-hidden />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-brand-500 to-brand-700 text-white text-xs font-bold uppercase tracking-wider shadow-glow-brand-sm">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {isBestSeller ? "El más vendido" : "Destacado"}
                </span>
                {spotlight && (
                  <div className="absolute right-4 bottom-4 nc-chip !py-2">
                    <span className="text-brand-800 font-display font-bold text-lg leading-none">
                      {formatPrice(spotlight.price, spotlight.currency ?? "USD")}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 px-2 pt-4 pb-1.5">
                <div className="min-w-0">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.16em] mb-1">
                    Producto destacado
                  </p>
                  <p className="text-slate-900 font-display font-bold text-xl leading-tight truncate">
                    {spotlight?.name ?? "Cargando…"}
                  </p>
                </div>
                {spotlight && (
                  <Button
                    asChild
                    size="lg"
                    className="shrink-0 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-glow-brand-sm hover:shadow-glow-brand hover:brightness-[1.03] font-bold transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Link to={`/producto/${encodeURIComponent(spotlight.slug)}`} className="flex items-center gap-2">
                      Ver <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Chips flotantes de confianza */}
            <div className="absolute -top-5 -right-2 sm:-right-5 nc-chip animate-float z-10">
              <span className="nc-icon-tile-sm !h-8 !w-8">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-700">Garantía incluida</span>
            </div>
            <div
              className="absolute -bottom-5 -left-2 sm:-left-5 nc-chip animate-float z-10"
              style={{ animationDelay: "1.4s" }}
            >
              <span className="nc-icon-tile-sm !h-8 !w-8">
                <Truck className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-700">Entrega en La Habana</span>
            </div>
            <div
              className="absolute top-1/2 -left-4 sm:-left-8 nc-chip animate-float z-10 hidden md:inline-flex"
              style={{ animationDelay: "2.2s" }}
            >
              <BadgeCheck className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-700">Prueba al recibir</span>
            </div>
          </div>
        </div>

        {/* Tira de beneficios bajo el hero */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: "Garantía real", text: "Prueba tu producto al entregar" },
            { icon: Truck, title: "Mensajería propia", text: "Entrega en toda La Habana" },
            { icon: Zap, title: "Asesoría experta", text: "Te ayudamos por WhatsApp" },
          ].map((b, i) => (
            <div
              key={b.title}
              className="nc-card-premium !rounded-3xl p-5 flex items-center gap-4 animate-fade-in-up"
              style={{ animationDelay: `${0.4 + i * 0.12}s` }}
            >
              <span className="nc-icon-tile-md shrink-0">
                <b.icon className="w-6 h-6" strokeWidth={2.2} />
              </span>
              <div>
                <p className="font-display font-bold text-slate-900">{b.title}</p>
                <p className="text-sm text-slate-500">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divisor de ondas de agua hacia la sección clara siguiente */}
      <div className="nc-waves" aria-hidden>
        <svg className="nc-wave nc-wave-b" viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_PATH} fill="#bfdbfe" opacity="0.55" />
        </svg>
        <svg className="nc-wave nc-wave-a" viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_PATH} fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, ShieldCheck, Star, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

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

const checklist = [
  { icon: ShieldCheck, text: "Garantía real y prueba al entregar" },
  { icon: Truck, text: "Mensajería en toda La Habana" },
  { icon: Zap, text: "Te asesoramos por WhatsApp" },
];

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
    { value: "24 horas", label: "Atención por WhatsApp" },
    { value: "USD · CUP", label: "Pagas al recibir" },
  ];

  return (
    <section className="relative overflow-hidden text-slate-900">
      {/* Fondo claro estilo Staff: lavados brand sobre el pastel del body */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-100/60 via-transparent to-transparent" aria-hidden />
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-400/30 rounded-full filter blur-3xl animate-blob pointer-events-none" aria-hidden />
      <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-brand-300/25 rounded-full filter blur-3xl animate-blob animation-delay-2000 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-radial-glow opacity-60 pointer-events-none" aria-hidden />
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />

      <div className="container-page relative py-16 md:py-24 lg:py-28">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          {/* Columna izquierda */}
          <div className="space-y-7 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/70 shadow-glow-brand-sm">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" aria-hidden />
              <span className="text-sm font-semibold text-slate-700">Tienda de electrónica · La Habana</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]">
                <span className="block text-slate-900">Electrónica de verdad</span>
                <span className="block nc-title-gradient">
                  para La Habana
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed font-light">
                Cargadores para motos eléctricas, audio y piezas. Garantía real, entrega a domicilio
                y pago en USD o CUP cuando el producto está en tus manos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <Button
                asChild
                size="xl"
                className="btn-shine group bg-gradient-to-br from-brand-500 via-brand-600 to-grape-600 text-white font-bold rounded-2xl shadow-glow-brand-sm hover:shadow-glow-brand hover:brightness-[1.08] transition-all duration-300 hover:-translate-y-0.5"
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
                className="glass text-slate-900 hover:border-brand-400/60 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
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

            {/* Stats honestos */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-900/10">
              {stats.map((stat, i) => (
                <div key={stat.label} className="animate-fade-in-up" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                  <p className="text-2xl md:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-grape-600">
                    {stat.value}
                  </p>
                  <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <ul className="space-y-2.5 pt-2">
              {checklist.map((item, i) => (
                <li
                  key={item.text}
                  className="flex items-center gap-3 animate-fade-in-left"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <span className="nc-icon-tile-sm">
                    <item.icon className="w-4 h-4" />
                  </span>
                  <span className="text-slate-700 font-medium text-[15px]">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna derecha: producto protagonista real */}
          <div className="relative animate-fade-in-right" style={{ animationDelay: "0.25s" }}>
            <div className="absolute -inset-6 bg-brand-400/25 blur-3xl rounded-full pointer-events-none" aria-hidden />
            <div className="relative rounded-[2rem] glass-water p-4 sm:p-5 hover:border-brand-300/70 transition-colors duration-500">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" aria-hidden />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/95 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {isBestSeller ? "El más vendido" : "Destacado"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-2 pt-4 pb-1.5">
                <div className="min-w-0">
                  <p className="text-slate-900 font-display font-bold text-lg leading-tight truncate">
                    {spotlight?.name ?? "Cargando…"}
                  </p>
                  <p className="text-brand-700 font-bold text-xl mt-0.5">
                    {spotlight ? formatPrice(spotlight.price, spotlight.currency ?? "USD") : "···"}
                  </p>
                </div>
                {spotlight && (
                  <Button
                    asChild
                    className="shrink-0 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-grape-600 text-white shadow-glow-brand-sm hover:shadow-glow-brand hover:brightness-[1.08] font-bold transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Link to={`/producto/${encodeURIComponent(spotlight.slug)}`} className="flex items-center gap-2">
                      Ver <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Chips flotantes */}
            <div className="absolute -top-4 -right-2 sm:-right-4 flex items-center gap-2 rounded-2xl border border-white/60 glass px-3.5 py-2.5 animate-float">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Garantía incluida</span>
            </div>
            <div
              className="absolute -bottom-4 -left-2 sm:-left-4 flex items-center gap-2 rounded-2xl border border-white/60 glass px-3.5 py-2.5 animate-float"
              style={{ animationDelay: "1.4s" }}
            >
              <Truck className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-700">Entrega en La Habana</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divisor de ondas de agua hacia la sección clara siguiente */}
      <div className="nc-waves" aria-hidden>
        <svg className="nc-wave nc-wave-b" viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_PATH} fill="#dbeafe" opacity="0.6" />
        </svg>
        <svg className="nc-wave nc-wave-a" viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_PATH} fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, ShieldCheck, Star, Truck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { Reveal } from "@/components/Reveal";
import { useCountUp } from "@/components/useCountUp";

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
  const animatedCount = useCountUp(productCount ?? 0, 1400, productCount !== null);

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
    { value: productCount !== null ? String(animatedCount) : "···", label: "Productos disponibles" },
    { value: "8am–8pm", label: "Atención por WhatsApp" },
    { value: "USD · CUP", label: "Pagas al recibir" },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Orbes pastel flotantes del hero */}
      <div className="cr-orb cr-orb-a" aria-hidden />
      <div className="cr-orb cr-orb-b" aria-hidden />

      <div className="container-page relative py-16 md:py-24 lg:py-28">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          {/* Columna izquierda */}
          <div className="space-y-7">
            <span className="cr-chip">
              <span className="w-2 h-2 rounded-full bg-emerald-500 cr-pulse-soft" aria-hidden />
              Tienda de electrónica · La Habana
            </span>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]">
                <span className="block text-slate-900">Electrónica de verdad</span>
                <span className="block cr-shimmer-text">para La Habana</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed font-light">
                Cargadores para motos eléctricas, audio y piezas. Garantía real, entrega a domicilio
                y pago en USD o CUP cuando el producto está en tus manos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <Link
                to="/tienda"
                className="cr-btn group inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base"
              >
                Explorar la tienda
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
              </Link>
              <a
                href="https://wa.me/5363180910"
                target="_blank"
                rel="noopener noreferrer"
                className="cr-btn-ghost inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base"
              >
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                WhatsApp directo
              </a>
            </div>

            {/* Stats honestos */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-blue-100">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="cr-shimmer-text text-2xl md:text-3xl font-display font-bold tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <ul className="space-y-2.5 pt-2">
              {checklist.map((item) => (
                <li key={item.text} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-100 border border-blue-200/70 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-blue-700" />
                  </span>
                  <span className="text-slate-700 font-medium text-[15px]">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna derecha: producto protagonista real */}
          <div className="relative">
            <div className="relative rounded-[2rem] cr-glass cr-sheen cr-lift p-4 sm:p-5">
              <div className="relative overflow-hidden rounded-3xl aspect-[4/3] bg-gradient-to-br from-blue-100 via-slate-100 to-cyan-100">
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
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-blue-100 to-slate-200" aria-hidden />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent pointer-events-none" aria-hidden />
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
                  <p className="text-blue-700 font-bold text-xl mt-0.5">
                    {spotlight ? formatPrice(spotlight.price, spotlight.currency ?? "USD") : "···"}
                  </p>
                </div>
                {spotlight && (
                  <Link
                    to={`/producto/${encodeURIComponent(spotlight.slug)}`}
                    className="cr-btn shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                  >
                    Ver <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>

            {/* Chips flotantes */}
            <div className="absolute -top-4 -right-2 sm:-right-4 flex items-center gap-2 rounded-2xl cr-glass-soft px-3.5 py-2.5 cr-float-slow">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Garantía incluida</span>
            </div>
            <div className="absolute -bottom-4 -left-2 sm:-left-4 flex items-center gap-2 rounded-2xl cr-glass-soft px-3.5 py-2.5 cr-float-slow" style={{ animationDelay: "1.4s" }}>
              <Truck className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Entrega en La Habana</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divisor de ondas de agua hacia la sección siguiente */}
      <div className="nc-waves" aria-hidden>
        <svg className="nc-wave nc-wave-b" viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_PATH} fill="#bfdbfe" opacity="0.5" />
        </svg>
        <svg className="nc-wave nc-wave-a" viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_PATH} fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}

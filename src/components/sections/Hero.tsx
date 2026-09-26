import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, ShieldCheck, Star, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import "@/components/sections/visual-effects.css";

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
    { value: "8am–8pm", label: "Atención por WhatsApp" },
    { value: "USD · CUP", label: "Pagas al recibir" },
  ];

  return (
    <section className="relative overflow-hidden bg-[#08080d] text-white">
      {/* Fondo: negro volt con orbes de energía */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0c16] via-[#08080d] to-[#08080d]" aria-hidden />
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-violet-600/20 rounded-full filter blur-3xl animate-orb-drift pointer-events-none" aria-hidden />
      <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-fuchsia-500/10 rounded-full filter blur-3xl animate-orb-drift pointer-events-none" style={{ animationDelay: "6s" }} aria-hidden />
      <div className="absolute top-1/3 left-1/2 w-80 h-80 bg-lime-400/10 rounded-full filter blur-3xl animate-orb-drift pointer-events-none" style={{ animationDelay: "12s" }} aria-hidden />
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />

      <div className="container-page relative py-16 md:py-24 lg:py-28">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          {/* Columna izquierda */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md rise-in d1">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" aria-hidden />
              <span className="text-sm font-semibold text-slate-200">Tienda de electrónica · La Habana</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05] rise-in d2">
                <span className="block text-white">Electrónica de verdad</span>
                <span className="block nc-text-shimmer">
                  para La Habana
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-xl leading-relaxed font-light rise-in d3">
                Cargadores para motos eléctricas, audio y piezas. Garantía real, entrega a domicilio
                y pago en USD o CUP cuando el producto está en tus manos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-1 rise-in d3">
              <Button
                asChild
                size="xl"
                className="btn-shine group bg-[#a3e635] text-[#0c0c14] hover:bg-[#bef264] font-bold rounded-2xl glow-volt transition-all duration-300 hover:-translate-y-0.5"
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
                className="border-white/20 bg-white/5 text-white backdrop-blur-md hover:bg-white/10 hover:border-emerald-400/50 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <a
                  href="https://wa.me/5363180910"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  WhatsApp directo
                </a>
              </Button>
            </div>

            {/* Stats honestos */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 rise-in d4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl md:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-lime-300 to-violet-400">
                    {stat.value}
                  </p>
                  <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <ul className="space-y-2.5 pt-2 rise-in d5">
              {checklist.map((item) => (
                <li
                  key={item.text}
                  className="flex items-center gap-3"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-lime-400/15 border border-lime-300/25 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-lime-300" />
                  </span>
                  <span className="text-slate-300 font-medium text-[15px]">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna derecha: producto protagonista real */}
          <div className="relative rise-in d3">
            <div className="absolute -inset-6 bg-violet-600/15 blur-3xl rounded-full pointer-events-none" aria-hidden />
            <div className="relative rounded-[2rem] border border-white/25 nc-liquid nc-sheen p-4 sm:p-5 hover:border-white/40 transition-colors duration-500">
              <div className="relative overflow-hidden rounded-3xl aspect-[4/3] bg-slate-800/60 nc-ripple">
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
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-700/60 to-slate-800/60" aria-hidden />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" aria-hidden />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-400/95 text-[#0c0c14] text-xs font-bold uppercase tracking-wider shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {isBestSeller ? "El más vendido" : "Destacado"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-2 pt-4 pb-1.5">
                <div className="min-w-0">
                  <p className="text-white font-display font-bold text-lg leading-tight truncate">
                    {spotlight?.name ?? "Cargando…"}
                  </p>
                  <p className="text-lime-300 font-bold text-xl mt-0.5">
                    {spotlight ? formatPrice(spotlight.price, spotlight.currency ?? "USD") : "···"}
                  </p>
                </div>
                {spotlight && (
                  <Button
                    asChild
                    className="shrink-0 rounded-xl bg-white text-slate-950 hover:bg-[#bef264] font-bold transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Link to={`/producto/${encodeURIComponent(spotlight.slug)}`} className="flex items-center gap-2">
                      Ver <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Chips flotantes */}
            <div className="absolute -top-4 -right-2 sm:-right-4 flex items-center gap-2 rounded-2xl border border-white/25 nc-liquid px-3.5 py-2.5 animate-float">
              <ShieldCheck className="w-4 h-4 text-lime-300" />
              <span className="text-xs font-bold text-slate-200">Garantía incluida</span>
            </div>
            <div
              className="absolute -bottom-4 -left-2 sm:-left-4 flex items-center gap-2 rounded-2xl border border-white/25 nc-liquid px-3.5 py-2.5 animate-float"
              style={{ animationDelay: "1.4s" }}
            >
              <Truck className="w-4 h-4 text-lime-300" />
              <span className="text-xs font-bold text-slate-200">Entrega en La Habana</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divisor de ondas: ya no hay sección clara después, funden al negro */}
      <div className="nc-waves" aria-hidden>
        <svg className="nc-wave nc-wave-b" viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_PATH} fill="#08080d" opacity="0.5" />
        </svg>
        <svg className="nc-wave nc-wave-a" viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_PATH} fill="#08080d" />
        </svg>
      </div>
    </section>
  );
}

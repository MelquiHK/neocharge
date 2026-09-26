import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Download,
  Smartphone,
  WifiOff,
  Bell,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";

const benefits = [
  {
    icon: Smartphone,
    title: "Acceso rápido",
    text: "Abre la tienda con un toque, sin escribir la dirección en el navegador.",
  },
  {
    icon: WifiOff,
    title: "Catálogo sin conexión",
    text: "Explora los productos y precios aunque la conexión esté lenta o se caiga.",
  },
  {
    icon: Bell,
    title: "Avisos de ofertas",
    text: "Entérate primero cuando lleguen cargadores nuevos y ofertas exclusivas.",
  },
  {
    icon: ShoppingBag,
    title: "Compra más cómoda",
    text: "Carrito, pedidos y seguimiento desde una pantalla diseñada para tu móvil.",
  },
  {
    icon: ShieldCheck,
    title: "Garantía en mano",
    text: "Guarda tus facturas y garantía dentro de la app, siempre disponibles.",
  },
  {
    icon: Zap,
    title: "Pensada para Cuba",
    text: "Ligera y optimizada: funciona bien con datos limitados y móviles modestos.",
  },
];

/** Landing SOLO Android para descargar la app de NeoCharge. */
export default function DescargarApp() {
  useEffect(() => {
    document.title = "Descargar app — NeoCharge";
  }, []);

  return (
    <div className="cr-page">
      {/* Orbes pastel */}
      <div className="cr-orb cr-orb-a" aria-hidden />
      <div className="cr-orb cr-orb-b" aria-hidden />
      <div className="cr-orb cr-orb-c" aria-hidden />

      <div className="relative container-page pt-10 md:pt-16 pb-20 md:pb-28">
        {/* Hero */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="text-center lg:text-left">
            <Reveal>
              <span className="cr-chip">
                <Smartphone className="w-3.5 h-3.5" /> App para Android
              </span>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                <span className="cr-shimmer-text">Lleva NeoCharge</span>
                <br />
                <span className="text-slate-900">en tu bolsillo</span>
              </h1>
            </Reveal>

            <Reveal delay={2}>
              <p className="mt-5 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
                La tienda completa de electrónica en tu móvil: catálogo, ofertas,
                pedidos y garantía, más rápido y cómodo que en el navegador.
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <a
                  href="/descargar-app.apk"
                  download
                  className="cr-btn cr-lift inline-flex items-center gap-3 px-8 py-4 text-lg"
                >
                  <Download className="w-5 h-5" /> Descargar APK
                </a>
                <Link
                  to="/tienda"
                  className="cr-btn-ghost inline-flex items-center gap-2 px-6 py-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver a la tienda
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Android 10 o superior · Gratis · Instalación en menos de un minuto
              </p>
            </Reveal>

            <Reveal delay={4}>
              <ul className="mt-8 space-y-3 text-left max-w-md mx-auto lg:mx-0">
                {[
                  "No necesitas cuenta de Google para instalarla",
                  "Ocupa poco espacio y gasta pocos datos",
                  "Los mismos precios y garantía de la tienda web",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Mockup de teléfono en CSS */}
          <Reveal delay={2} className="flex justify-center">
            <div className="cr-float-slow relative" aria-hidden>
              <div className="relative w-64 sm:w-72 rounded-[2.75rem] border-[10px] border-slate-900 bg-slate-900 shadow-[0_30px_80px_rgba(37,99,235,0.30)]">
                {/* notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-full z-10" />
                <div className="rounded-[2rem] overflow-hidden bg-gradient-to-b from-blue-50 via-white to-blue-100/60 min-h-[480px] flex flex-col">
                  {/* status bar */}
                  <div className="pt-3 pb-1 px-5 flex justify-between text-[10px] font-bold text-slate-500">
                    <span>9:41</span>
                    <span>4G ▮▮▮</span>
                  </div>
                  {/* app header */}
                  <div className="px-4 py-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-md">
                      <Zap className="w-5 h-5 text-white" strokeWidth={2.5} fill="currentColor" />
                    </div>
                    <div className="leading-none">
                      <p className="font-display font-bold text-sm text-slate-900">NeoCharge</p>
                      <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400">
                        Habana · 24h
                      </p>
                    </div>
                  </div>
                  {/* hero dentro de la app */}
                  <div className="mx-4 mt-1 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 p-4 text-white shadow-lg">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                      Oferta de hoy
                    </p>
                    <p className="font-display font-bold text-base leading-snug mt-0.5">
                      Cargador 72V 5A
                    </p>
                    <p className="text-xs text-white/85 mt-1">El más vendido · Entrega 24h</p>
                  </div>
                  {/* productos falsos */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-2.5">
                    {["Cargador 48V", "Cables USB-C", "Batería 12V", "Amplificador"].map((n) => (
                      <div
                        key={n}
                        className="rounded-xl bg-white/80 border border-blue-100 p-2.5 shadow-sm"
                      >
                        <div className="h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-blue-400" fill="currentColor" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 mt-1.5 truncate">{n}</p>
                        <p className="text-[10px] font-black text-blue-600">$</p>
                      </div>
                    ))}
                  </div>
                  {/* tab bar */}
                  <div className="mt-auto mx-4 mb-4 rounded-2xl bg-white/90 border border-blue-100 shadow-md px-6 py-2.5 flex justify-between">
                    <Zap className="w-4 h-4 text-blue-600" fill="currentColor" />
                    <ShoppingBag className="w-4 h-4 text-slate-300" />
                    <Bell className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </div>
              {/* brillo detrás */}
              <div className="absolute -inset-8 -z-10 bg-blue-300/20 blur-3xl rounded-full" />
            </div>
          </Reveal>
        </div>

        {/* Beneficios */}
        <div className="mt-20 md:mt-28">
          <Reveal className="text-center">
            <span className="cr-chip">Por qué instalarla</span>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              Todo lo de la tienda, <span className="cr-shimmer-text">más rápido</span>
            </h2>
          </Reveal>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3 + 1) as 1 | 2 | 3}>
                <div className="cr-glass cr-sheen cr-lift rounded-3xl p-6 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <b.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="mt-4 font-display font-bold text-lg text-slate-900">{b.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <Reveal className="mt-16 md:mt-20">
          <div className="cr-glass-strong cr-sheen rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden">
            <div className="cr-orb cr-orb-a !w-72 !h-72" aria-hidden />
            <h2 className="relative font-display text-3xl md:text-4xl font-black tracking-tight">
              <span className="cr-shimmer-text">Instálala hoy</span>
              <span className="text-slate-900"> y compra más cómodo</span>
            </h2>
            <p className="relative mt-3 text-slate-600 max-w-lg mx-auto">
              Descarga directa, sin tiendas intermedias. En menos de un minuto la
              tienes funcionando en tu móvil.
            </p>
            <div className="relative mt-8">
              <a
                href="/descargar-app.apk"
                download
                className="cr-btn cr-lift inline-flex items-center gap-3 px-10 py-4 text-lg"
              >
                <Download className="w-5 h-5" /> Descargar APK
              </a>
              <p className="mt-4 text-sm text-slate-500">Android 10 o superior · Gratis</p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  Zap,
  Rocket,
  ShoppingBag,
  Tag,
  MessageCircle,
  Smartphone,
  Download,
  CheckCircle2,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import "@/components/sections/visual-effects.css";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const WHATSAPP_URL = "https://wa.me/5363180910";

function isAndroid(): boolean {
  const ua = navigator.userAgent || "";
  return /Android/.test(ua);
}

const BENEFITS = [
  {
    icon: Rocket,
    title: "Acceso rápido",
    text: "Abre NeoCharge con un toque, sin escribir la dirección cada vez.",
  },
  {
    icon: ShoppingBag,
    title: "Catálogo sin conexión",
    text: "Revisa productos y precios aunque tu conexión esté floja.",
  },
  {
    icon: Tag,
    title: "Ofertas y novedades",
    text: "Entérate primero de los cargadores nuevos y las rebajas.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp directo",
    text: "Escríbenos al instante desde la app cuando necesites ayuda.",
  },
];

/**
 * Landing /descargar-app: descarga del APK de NeoCharge para Android.
 */
export default function DescargarApp() {
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [canQuickInstall, setCanQuickInstall] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    document.title = "Descargar app — NeoCharge";
    setIsAndroidDevice(isAndroid());

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanQuickInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const handleQuickInstall = async () => {
    const p = deferredPrompt.current;
    if (!p) return;
    deferredPrompt.current = null;
    setCanQuickInstall(false);
    await p.prompt();
    await p.userChoice;
  };

  return (
    <div className="relative min-h-screen bg-[#08080d] text-white overflow-hidden">
      {/* Washes y orbes de fondo VOLT */}
      <div className="nc-wash-a pointer-events-none absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-[#8b5cf6]/20 blur-3xl" />
      <div className="nc-wash-b pointer-events-none absolute top-1/3 -right-40 w-[40rem] h-[40rem] rounded-full bg-[#d946ef]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-[30rem] h-[30rem] rounded-full bg-[#a3e635]/10 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* HERO */}
        <Reveal className="text-center">
          <span className="animate-float inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#a3e635] text-[#0c0c14] mb-6">
            <Zap className="w-8 h-8" fill="currentColor" />
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Lleva <span className="text-volt-gradient">NeoCharge</span> en tu bolsillo
          </h1>
          <p className="mt-5 text-lg text-white/70 max-w-2xl mx-auto">
            Instala la app en tu Android y compra cargadores, cables y accesorios de forma
            más rápida, cómoda y sin perderte ninguna oferta.
          </p>
          {canQuickInstall && (
            <button
              type="button"
              onClick={handleQuickInstall}
              className="animate-pulse-glow mt-8 inline-flex items-center gap-2 bg-[#a3e635] text-[#0c0c14] hover:bg-[#bef264] font-bold rounded-xl px-8 py-4 text-lg"
            >
              <Download className="w-5 h-5" />
              Instalación rápida
            </button>
          )}
        </Reveal>

        {/* BENEFICIOS */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 90}>
              <div className="nc-liquid h-full rounded-2xl border border-white/15 bg-white/5 p-5">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#a3e635]/15 text-[#a3e635] mb-4">
                  <b.icon className="w-5 h-5" />
                </span>
                <h2 className="font-bold text-lg">{b.title}</h2>
                <p className="mt-1 text-sm text-white/65">{b.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* TARJETA ANDROID */}
        <div className="mt-16 sm:mt-20 max-w-xl mx-auto">
          <Reveal>
            <div
              className={`relative nc-liquid h-full rounded-2xl border border-white/15 bg-white/5 p-7 ${
                isAndroidDevice ? "ring-2 ring-[#a3e635]" : ""
              }`}
            >
              {isAndroidDevice && (
                <span className="absolute -top-3 right-5 inline-flex items-center gap-1 bg-[#a3e635] text-[#0c0c14] text-xs font-bold rounded-full px-3 py-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  Tu dispositivo
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#a3e635] text-[#0c0c14]">
                  <Smartphone className="w-6 h-6" />
                </span>
                <h2 className="text-2xl font-extrabold">Android</h2>
              </div>
              <p className="text-white/65 text-sm mb-6">
                Descarga el archivo de instalación y abre NeoCharge como una app nativa,
                con acceso directo en tu pantalla de inicio.
              </p>
              <a
                href="/descargar-app.apk"
                download
                className="animate-pulse-glow inline-flex items-center gap-2 bg-[#a3e635] text-[#0c0c14] hover:bg-[#bef264] font-bold rounded-xl px-6 py-3"
              >
                <Download className="w-5 h-5" />
                Descargar APK
              </a>
              <p className="mt-4 text-xs text-white/50 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
                Android 10 o superior
              </p>
            </div>
          </Reveal>
        </div>

        {/* CONTACTO */}
        <Reveal className="mt-16 sm:mt-20 text-center">
          <div className="nc-liquid rounded-2xl border border-white/15 bg-white/5 px-6 py-8 max-w-xl mx-auto">
            <p className="font-bold text-lg">¿Problemas instalando la app?</p>
            <p className="text-sm text-white/60 mt-1 mb-5">
              Escríbenos por WhatsApp y te ayudamos paso a paso.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#a3e635] text-[#0c0c14] hover:bg-[#bef264] font-bold rounded-xl px-6 py-3"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp +53 63180910
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

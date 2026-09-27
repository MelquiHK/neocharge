import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Smartphone,
  Zap,
  ShoppingBag,
  Download,
  Share,
  MoreVertical,
  PlusSquare,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const APK_URL = "/descargas/neocharge-tienda.apk";
const APK_VERSION = "1.0.10";
const APK_SIZE = "6.0 MB";

/**
 * Página de descarga/instalación de la app de NeoCharge.
 * La burbuja flotante lleva aquí a los visitantes que no tienen la app.
 */
export default function DescargarApp() {
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const handleInstall = async () => {
    if (installed) return;
    if (canInstall) {
      setInstalling(true);
      const ok = await promptInstall();
      setInstalling(false);
      if (ok) {
        setAccepted(true);
      } else {
        setShowManual(true);
      }
    } else {
      setShowManual(true);
    }
  };

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a la tienda
      </Link>

      <div className="text-center space-y-5 pt-4">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute -inset-3 rounded-[2rem] bg-brand-400/30 blur-2xl" aria-hidden />
          <div className="relative w-24 h-24 rounded-[1.75rem] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand">
            <Smartphone className="w-11 h-11 text-white" />
          </div>
        </div>
        <span className="nc-eyebrow">
          <span className="nc-eyebrow-dot" />
          App NeoCharge · v{APK_VERSION}
        </span>
        <h1 className="nc-display text-4xl md:text-5xl nc-title-premium">
          Lleva NeoCharge en tu bolsillo
        </h1>
        <p className="text-slate-500 text-lg font-light max-w-xl mx-auto leading-relaxed">
          Instala la app y compra tus cargadores y accesorios más rápido, directo
          desde la pantalla de inicio de tu teléfono. Gratis, sin registro.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
        <div className="nc-card-premium !rounded-3xl p-5 flex items-start gap-4">
          <span className="nc-icon-tile-md shrink-0">
            <Zap className="w-6 h-6" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display font-bold text-slate-900">Apertura instantánea</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Abre la tienda en un toque, sin escribir la dirección web.
            </p>
          </div>
        </div>
        <div className="nc-card-premium !rounded-3xl p-5 flex items-start gap-4">
          <span className="nc-icon-tile-md shrink-0">
            <ShoppingBag className="w-6 h-6" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display font-bold text-slate-900">Compra más rápido</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Tu carrito y tus favoritos siempre a la mano.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 md:p-8 nc-card-premium !rounded-[2rem] text-center space-y-5">
        {installed || accepted ? (
          <p className="flex items-center justify-center gap-2 font-bold text-green-600">
            <CheckCircle2 className="w-5 h-5" /> ¡Ya tienes la app instalada!
          </p>
        ) : (
          <>
            <Button
              type="button"
              variant="hero"
              size="lg"
              className="w-full sm:w-auto px-10"
              onClick={handleInstall}
              disabled={installing}
            >
              <Download className="w-5 h-5" />
              {installing ? "Abriendo instalación…" : "Instalar la app"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {canInstall
                ? "Se abrirá el diálogo de instalación de tu teléfono."
                : isIOS
                  ? "En iPhone la instalación se hace desde Safari (te explicamos abajo)."
                  : "Si tu navegador no muestra el diálogo, sigue los pasos de abajo."}
            </p>
          </>
        )}
      </div>

      {showManual && !installed && !accepted && (
        <div className="mt-6 p-5 glass rounded-3xl space-y-3 animate-fade-in">
          <p className="font-bold text-sm">Instálala manualmente en 3 pasos:</p>
          {isIOS ? (
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li className="flex items-center gap-2">
                <Share className="w-4 h-4 shrink-0" /> Toca el botón <b>Compartir</b> en Safari.
              </li>
              <li className="flex items-center gap-2">
                <PlusSquare className="w-4 h-4 shrink-0" /> Elige <b>“Añadir a pantalla de inicio”</b>.
              </li>
              <li>Toca <b>Añadir</b> arriba a la derecha. ¡Listo!</li>
            </ol>
          ) : (
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li className="flex items-center gap-2">
                <MoreVertical className="w-4 h-4 shrink-0" /> Toca el menú <b>⋮</b> de tu navegador.
              </li>
              <li>
                Elige <b>“Instalar app”</b> o <b>“Añadir a pantalla de inicio”</b>.
              </li>
              <li>Confirma y la verás junto a tus demás apps.</li>
            </ol>
          )}
        </div>
      )}

      <div className="mt-8 p-5 glass rounded-3xl space-y-3 hover-lift">
        <p className="font-bold text-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> ¿Prefieres el archivo directo? (Android)
        </p>
        <p className="text-xs text-muted-foreground">
          Descarga el APK e instálalo manualmente. Versión {APK_VERSION} · {APK_SIZE} ·
          gratis.
        </p>
        <a href={APK_URL} download>
          <Button type="button" variant="purple" className="w-full">
            <Download className="w-4 h-4" /> Descargar APK para Android
          </Button>
        </a>
        <p className="text-[11px] text-muted-foreground">
          Al instalarlo, Android te pedirá permitir “instalar apps desconocidas” una
          sola vez: es normal porque no viene de la Play Store.
        </p>
      </div>
    </div>
  );
}

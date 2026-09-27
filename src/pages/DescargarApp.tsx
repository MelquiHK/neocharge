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
const APK_VERSION = "1.0.9";
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

      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-primary flex items-center justify-center shadow-lg">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Lleva NeoCharge en tu bolsillo
        </h1>
        <p className="text-muted-foreground">
          Instala la app y compra tus cargadores y accesorios más rápido, directo
          desde la pantalla de inicio de tu teléfono. Gratis, sin registro.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
          <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Apertura instantánea</p>
            <p className="text-xs text-muted-foreground">
              Abre la tienda en un toque, sin escribir la dirección web.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
          <ShoppingBag className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Compra más rápido</p>
            <p className="text-xs text-muted-foreground">
              Tu carrito y tus favoritos siempre a la mano.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 text-center space-y-4">
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
        <div className="mt-6 p-5 rounded-2xl border bg-card space-y-3 animate-in fade-in">
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

      <div className="mt-8 p-5 rounded-2xl border bg-card space-y-3">
        <p className="font-bold text-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> ¿Prefieres el archivo directo? (Android)
        </p>
        <p className="text-xs text-muted-foreground">
          Descarga el APK e instálalo manualmente. Versión {APK_VERSION} · {APK_SIZE} ·
          gratis.
        </p>
        <a href={APK_URL} download>
          <Button type="button" variant="outline" className="w-full">
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

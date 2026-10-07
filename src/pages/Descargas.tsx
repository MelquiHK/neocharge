import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Smartphone,
  Download,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSIONS, CURRENT_VERSION } from "@/data/app-versions";

/**
 * Página de descargas de la app NeoCharge con historial de versiones.
 * El APK se sirve desde /descargas/neocharge-tienda.apk (enlace permanente).
 */
export default function Descargas() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a la tienda
      </Link>

      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-brand-300 via-brand-400 to-brand-500 flex items-center justify-center shadow-glow-brand">
          <Smartphone className="w-10 h-10 text-slate-900" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight nc-title-gradient">
          Descarga la app NeoCharge
        </h1>
        <p className="text-muted-foreground">
          Lleva la tienda en tu bolsillo: compra más rápido directo desde tu
          pantalla de inicio. Gratis, solo para Android.
        </p>
      </div>

      {/* Tarjeta principal de descarga */}
      <div className="mt-8 p-6 glass rounded-3xl border-brand-300/50 text-center space-y-4 shadow-glow-brand-sm">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Versión {CURRENT_VERSION.version}</span>
          <span>·</span>
          <span>{CURRENT_VERSION.date}</span>
          <span>·</span>
          <span>{CURRENT_VERSION.size}</span>
        </div>
        <a href={CURRENT_VERSION.apkUrl} download>
          <Button type="button" variant="hero" size="lg" className="w-full sm:w-auto px-10">
            <Download className="w-5 h-5" /> Descargar APK
          </Button>
        </a>
        <p className="text-[11px] text-muted-foreground">
          Al instalarlo, Android te pedirá permitir “instalar apps desconocidas” una
          sola vez: es normal porque no viene de la Play Store.
        </p>
      </div>

      {/* Historial de versiones */}
      <div className="mt-10 space-y-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> Historial de versiones
        </h2>
        {APP_VERSIONS.map((v) => {
          const key = `${v.version}-${v.date}`;
          const isOpen = openKey === key;
          const isCurrent = v === CURRENT_VERSION;
          return (
            <div key={key} className="glass rounded-3xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : key)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Versión {v.version}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Actual
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{v.date}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 animate-fade-in">
                  <ul className="space-y-1.5">
                    {v.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  {v.apkUrl && !isCurrent && (
                    <a href={v.apkUrl} download className="inline-block mt-3">
                      <Button type="button" variant="outline" size="sm">
                        <Download className="w-4 h-4" /> Descargar esta versión
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Service } from "@/types";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  SearchX,
  ShoppingBag,
  Tag,
} from "lucide-react";
import "@/components/sections/visual-effects.css";

const serviceTypeLabels = {
  purchase: {
    label: "Compra",
    badgeClass: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30",
    action: "Comprar servicio",
    hint: "Este servicio está listo para contratarse de forma directa. Escríbenos y coordinamos la compra contigo.",
  },
  request: {
    label: "Pedido / Solicitud",
    badgeClass: "bg-violet-400/15 text-violet-200 ring-violet-300/30",
    action: "Pedir servicio",
    hint: "Solicita este servicio por WhatsApp y te contactaremos para confirmar detalles, tiempos y coordinación.",
  },
} as const;

function formatServicePrice(service: Service): string {
  if (service.price == null) return "A convenir";
  return service.currency === "CUP"
    ? `${service.price} CUP`
    : `$${Number(service.price).toFixed(2)} USD`;
}

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { ref, visible } = useReveal();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) {
        console.error(error);
        setNotFound(true);
        setService(null);
      } else {
        setService(data as Service);
      }
      setLoading(false);
    };
    void load();
  }, [slug]);

  const typeKey = ((service?.service_type ?? "request") as keyof typeof serviceTypeLabels);
  const typeMeta = serviceTypeLabels[typeKey] ?? serviceTypeLabels.request;

  useSEO("services", service ? {
    title: `${service.title} | Servicios NeoCharge`,
    description: service.summary ?? service.description ?? `Servicio ${service.title} de NeoCharge en La Habana.`,
  } : undefined);

  const whatsappMessage = service
    ? `Hola, me interesa el servicio "${service.title}" (${formatServicePrice(service)}). ¿Me das más información?`
    : "";

  return (
    <div className="relative overflow-hidden bg-[#08080d]">
      {/* Fondo VOLT oscuro con lavados y orbes */}
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />
      <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-violet-600/20 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />
      <div className="absolute top-1/4 -right-32 w-[380px] h-[380px] rounded-full bg-fuchsia-500/10 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-1/4 w-[340px] h-[340px] rounded-full bg-lime-400/10 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />

      <div ref={ref} className={cn("relative container-page py-10 md:py-16 reveal", visible && "is-visible")}>
        <Link
          to="/servicios"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-lime-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a servicios
        </Link>

        {loading ? (
          <div className="rounded-[2rem] border border-white/15 bg-white/5 p-16 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-lime-300" />
            <p className="text-slate-400">Cargando servicio...</p>
          </div>
        ) : notFound || !service ? (
          <div className="max-w-xl mx-auto text-center rounded-[2.5rem] border border-white/15 bg-white/5 nc-liquid p-12 md:p-16 shadow-xl space-y-6">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-lime-400/10 border border-lime-300/25 flex items-center justify-center">
              <SearchX className="w-8 h-8 text-lime-300" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
              Servicio no encontrado
            </h1>
            <p className="text-slate-400 leading-relaxed">
              El servicio que buscas no existe o ya no está disponible. Revisa el catálogo
              de servicios activos o escríbenos y te ayudamos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button asChild variant="hero">
                <Link to="/servicios">Ver servicios</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                <a href={getWhatsAppLink("Hola, busco información sobre sus servicios.")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Hero del servicio: panel oscuro VOLT con vidrio líquido */}
            <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#121218] via-[#0c0c13] to-[#08080d] border border-white/15 text-white shadow-2xl nc-liquid nc-beam-host">
              <div className="nc-beam" aria-hidden />
              <div className="nc-wash-a" aria-hidden />
              <div
                className="absolute -top-32 -right-32 w-[380px] h-[380px] rounded-full bg-lime-400/10 blur-[120px] animate-orb-drift pointer-events-none"
                aria-hidden
              />
              <div className="relative p-8 md:p-12 lg:p-14">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 nc-liquid px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-100">
                    <Tag className="w-3.5 h-3.5 text-lime-300" /> {service.category ?? "General"}
                  </span>
                  <span className={cn("rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 backdrop-blur-md", typeMeta.badgeClass)}>
                    {typeMeta.label}
                  </span>
                </div>
                <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
                  {service.title}
                </h1>
                {service.summary && (
                  <p className="mt-5 text-lg md:text-xl text-slate-300 font-light leading-relaxed max-w-2xl">
                    {service.summary}
                  </p>
                )}
              </div>
            </section>

            {/* Contenido: descripción + tarjeta de contratación */}
            <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-8">
              <div className="space-y-8">
                {service.description && (
                  <section className="rounded-[2rem] border border-white/15 bg-white/5 nc-liquid p-8 md:p-10 shadow-sm">
                    <h2 className="font-display text-2xl font-bold tracking-tight mb-4 text-white">
                      Descripción del servicio
                    </h2>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line text-[17px]">
                      {service.description}
                    </p>
                  </section>
                )}

                {service.features && service.features.length > 0 && (
                  <section className="rounded-[2rem] border border-white/15 bg-white/5 nc-liquid p-8 md:p-10 shadow-sm">
                    <h2 className="font-display text-2xl font-bold tracking-tight mb-6 text-white">
                      Qué incluye
                    </h2>
                    <ul className="space-y-4">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-[16px]">
                          <span className="mt-0.5 w-7 h-7 rounded-full bg-lime-400/15 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-lime-300" />
                          </span>
                          <span className="text-slate-200 leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Tarjeta de contratación con vidrio */}
              <aside className="lg:sticky lg:top-28 h-fit">
                <div className="rounded-[2rem] border border-white/15 nc-liquid nc-sheen bg-white/5 p-7 md:p-8 shadow-xl space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Precio</p>
                    <p className="mt-2 font-display text-4xl font-bold tracking-tight text-lime-300">
                      {formatServicePrice(service)}
                    </p>
                  </div>

                  <div className="h-px bg-white/10" aria-hidden />

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">
                      {typeMeta.action}
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {typeMeta.hint}
                    </p>
                  </div>

                  <Button
                    asChild
                    variant="whatsapp"
                    size="lg"
                    className="w-full h-14 rounded-2xl text-base font-bold nc-btn-shine"
                  >
                    <a href={getWhatsAppLink(whatsappMessage)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      {service.service_type === "purchase" ? "Comprar por WhatsApp" : "Pedir por WhatsApp"}
                    </a>
                  </Button>

                  <Button asChild variant="outline" className="w-full rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10">
                    <Link to="/servicios">
                      Ver otros servicios <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  <p className="text-xs text-slate-500 text-center leading-relaxed">
                    <ShoppingBag className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    Atención directa con NeoCharge · La Habana
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

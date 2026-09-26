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
    badgeClass: "bg-blue-400/15 text-blue-200 ring-blue-300/30",
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
    <div className="relative overflow-hidden">
      {/* Fondo claro con lavados suaves */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pointer-events-none" aria-hidden />
      <div className="nc-section-wash absolute inset-0 pointer-events-none" aria-hidden />

      <div ref={ref} className={cn("relative container-page py-10 md:py-16 reveal", visible && "is-visible")}>
        <Link
          to="/servicios"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a servicios
        </Link>

        {loading ? (
          <div className="rounded-[2rem] border border-border bg-card p-16 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando servicio...</p>
          </div>
        ) : notFound || !service ? (
          <div className="max-w-xl mx-auto text-center rounded-[2.5rem] border border-border bg-card p-12 md:p-16 shadow-xl space-y-6">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
              <SearchX className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Servicio no encontrado
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              El servicio que buscas no existe o ya no está disponible. Revisa el catálogo
              de servicios activos o escríbenos y te ayudamos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button asChild variant="hero">
                <Link to="/servicios">Ver servicios</Link>
              </Button>
              <Button asChild variant="outline">
                <a href={getWhatsAppLink("Hola, busco información sobre sus servicios.")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Hero del servicio: panel oscuro con vidrio líquido */}
            <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0a1430] via-[#0d1b4d] to-[#070d20] text-white shadow-2xl nc-beam-host">
              <div className="nc-beam" aria-hidden />
              <div className="nc-wash-a" aria-hidden />
              <div
                className="absolute -top-32 -right-32 w-[380px] h-[380px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none"
                aria-hidden
              />
              <div className="relative p-8 md:p-12 lg:p-14">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 nc-liquid px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-100">
                    <Tag className="w-3.5 h-3.5" /> {service.category ?? "General"}
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
                  <section className="rounded-[2rem] border border-border bg-card p-8 md:p-10 shadow-sm">
                    <h2 className="font-display text-2xl font-bold tracking-tight mb-4">
                      Descripción del servicio
                    </h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-[17px]">
                      {service.description}
                    </p>
                  </section>
                )}

                {service.features && service.features.length > 0 && (
                  <section className="rounded-[2rem] border border-border bg-card p-8 md:p-10 shadow-sm">
                    <h2 className="font-display text-2xl font-bold tracking-tight mb-6">
                      Qué incluye
                    </h2>
                    <ul className="space-y-4">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-[16px]">
                          <span className="mt-0.5 w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </span>
                          <span className="text-foreground/90 leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Tarjeta de contratación con vidrio */}
              <aside className="lg:sticky lg:top-28 h-fit">
                <div className="rounded-[2rem] border border-white/40 nc-liquid-soft p-7 md:p-8 shadow-xl space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Precio</p>
                    <p className="mt-2 font-display text-4xl font-bold tracking-tight">
                      {formatServicePrice(service)}
                    </p>
                  </div>

                  <div className="h-px bg-border" aria-hidden />

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2">
                      {typeMeta.action}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
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

                  <Button asChild variant="outline" className="w-full rounded-2xl">
                    <Link to="/servicios">
                      Ver otros servicios <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
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

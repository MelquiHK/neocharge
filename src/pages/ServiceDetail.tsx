import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Service } from "@/types";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { Reveal } from "@/components/Reveal";
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
import "@/components/sections/crystal.css";

const serviceTypeLabels = {
  purchase: {
    label: "Compra",
    badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    action: "Comprar servicio",
    hint: "Este servicio está listo para contratarse de forma directa. Escríbenos y coordinamos la compra contigo.",
  },
  request: {
    label: "Pedido / Solicitud",
    badgeClass: "bg-blue-100 text-blue-700 ring-blue-200",
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
    <div className="cr-page">
      <div className="cr-orb cr-orb-a" aria-hidden />
      <div className="cr-orb cr-orb-b" aria-hidden />
      <div className="cr-orb cr-orb-c" aria-hidden />

      <div className="relative container-page py-10 md:py-16">
        <Link
          to="/servicios"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a servicios
        </Link>

        {loading ? (
          <div className="cr-glass-strong rounded-[2rem] p-16 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando servicio...</p>
          </div>
        ) : notFound || !service ? (
          <div className="cr-glass-strong max-w-xl mx-auto text-center rounded-[2.5rem] p-12 md:p-16 space-y-6">
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
            {/* Hero del servicio: vidrio cristal con brillo de agua */}
            <Reveal>
              <section className="cr-glass-strong cr-sheen relative overflow-hidden rounded-[2.5rem]">
                <div className="relative p-8 md:p-12 lg:p-14">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="cr-chip">
                      <Tag className="w-3.5 h-3.5" /> {service.category ?? "General"}
                    </span>
                    <span className={cn("rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ring-1", typeMeta.badgeClass)}>
                      {typeMeta.label}
                    </span>
                  </div>
                  <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
                    <span className="cr-shimmer-text">{service.title}</span>
                  </h1>
                  {service.summary && (
                    <p className="mt-5 text-lg md:text-xl text-slate-600 font-light leading-relaxed max-w-2xl">
                      {service.summary}
                    </p>
                  )}
                </div>
              </section>
            </Reveal>

            {/* Contenido: descripción + tarjeta de contratación */}
            <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-8">
              <div className="space-y-8">
                {service.description && (
                  <Reveal delay={1}>
                    <section className="cr-glass cr-sheen cr-lift rounded-[2rem] p-8 md:p-10">
                      <h2 className="font-display text-2xl font-bold tracking-tight mb-4">
                        Descripción del servicio
                      </h2>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-[17px]">
                        {service.description}
                      </p>
                    </section>
                  </Reveal>
                )}

                {service.features && service.features.length > 0 && (
                  <Reveal delay={2}>
                    <section className="cr-glass cr-sheen cr-lift rounded-[2rem] p-8 md:p-10">
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
                  </Reveal>
                )}
              </div>

              {/* Tarjeta de contratación con vidrio */}
              <aside className="lg:sticky lg:top-28 h-fit">
                <Reveal delay={1}>
                  <div className="cr-glass-strong cr-sheen rounded-[2rem] p-7 md:p-8 space-y-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Precio</p>
                      <p className="mt-2 font-display text-4xl font-bold tracking-tight">
                        {formatServicePrice(service)}
                      </p>
                    </div>

                    <div className="h-px bg-blue-900/10" aria-hidden />

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2">
                        {typeMeta.action}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {typeMeta.hint}
                      </p>
                    </div>

                    <a
                      href={getWhatsAppLink(whatsappMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cr-btn inline-flex items-center justify-center w-full h-14 text-base font-bold px-6"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      {service.service_type === "purchase" ? "Comprar por WhatsApp" : "Pedir por WhatsApp"}
                    </a>

                    <Link
                      to="/servicios"
                      className="cr-btn-ghost inline-flex items-center justify-center w-full px-6 py-3"
                    >
                      Ver otros servicios <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>

                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      <ShoppingBag className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                      Atención directa con NeoCharge · La Habana
                    </p>
                  </div>
                </Reveal>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

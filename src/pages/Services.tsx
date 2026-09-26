import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Service } from "@/types";
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, ShoppingBag } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import "@/components/sections/visual-effects.css";

const serviceTypeLabels = {
  purchase: {
    label: "Compra",
    badgeClass: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30",
    action: "Comprar servicio",
  },
  request: {
    label: "Pedido / Solicitud",
    badgeClass: "bg-violet-400/15 text-violet-200 ring-violet-300/30",
    action: "Pedir servicio",
  },
} as const;

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  // Ref espejo para la carga inicial: evita refetchear cuando el usuario cambia de servicio.
  const selectedServiceIdRef = useRef(selectedServiceId);
  selectedServiceIdRef.current = selectedServiceId;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        console.error(error);
        setServices([]);
      } else {
        const nextServices = (data ?? []) as Service[];
        setServices(nextServices);
        if (!selectedServiceIdRef.current && nextServices.length > 0) {
          setSelectedServiceId(nextServices[0].id);
        }
      }
      setLoading(false);
    };
    void load();
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? services[0] ?? null,
    [selectedServiceId, services]
  );

  useSEO("services");

  return (
    <div className="relative overflow-hidden bg-[#08080d]">
      {/* Lavados y orbes VOLT */}
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />
      <div className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full bg-violet-600/20 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />
      <div className="absolute top-1/3 -right-40 w-[420px] h-[420px] rounded-full bg-fuchsia-500/10 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-1/3 w-[360px] h-[360px] rounded-full bg-lime-400/10 blur-[120px] animate-orb-drift pointer-events-none" aria-hidden />

      <div className="relative container-page py-12 md:py-20">
        <Reveal>
          <header className="mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-300/25 text-lime-300 text-xs font-bold uppercase tracking-widest">
              Servicios Profesionales
            </div>
            <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight text-white">
              <span className="text-volt-gradient">Servicios de tecnología</span> <br />y soporte técnico
            </h1>
            <p className="text-xl text-slate-400 font-light max-w-3xl leading-relaxed">
              Descubre todo lo que hacemos más allá de la tienda: desarrollo de páginas web, programación, mantenimiento de SPLITS, reparaciones y soporte técnico especializado.
            </p>
          </header>
        </Reveal>

        {loading ? (
          <div className="rounded-3xl border border-white/15 bg-white/5 p-12 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-lime-300" />
            <p className="text-slate-400">Cargando servicios...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-3xl border border-white/15 bg-white/5 p-12 text-center space-y-4">
            <h2 className="font-display text-3xl font-bold text-white">No hay servicios publicados aún</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Pronto podrás ver aquí las opciones de mantenimiento, programación y soporte que ofrecemos.</p>
            <div className="pt-2">
              <Button asChild variant="hero"><Link to="/contacto">Contáctanos</Link></Button>
            </div>
          </div>
        ) : (
          <>
            {selectedService && (
              <Reveal>
                <section className="mb-10 overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br from-[#121218] via-[#0d0d16] to-[#08080d] text-white shadow-2xl nc-liquid">
                  <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <div>
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">
                          {selectedService.category ?? "General"}
                        </span>
                        <span className={"rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 " + (serviceTypeLabels[(selectedService.service_type ?? "request") as keyof typeof serviceTypeLabels]?.badgeClass ?? serviceTypeLabels.request.badgeClass)}>
                          {serviceTypeLabels[(selectedService.service_type ?? "request") as keyof typeof serviceTypeLabels]?.label ?? "Pedido / Solicitud"}
                        </span>
                      </div>

                      <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">{selectedService.title}</h2>
                      <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                        {selectedService.description ?? selectedService.summary ?? "Servicio especializado pensado para resolver tus necesidades técnicas con atención personalizada."}
                      </p>

                      <div className="mt-7 flex flex-wrap items-center gap-4">
                        <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Precio</p>
                          <p className="mt-1 text-2xl font-bold text-lime-300">
                            {selectedService.currency === "CUP" ? `${selectedService.price} CUP` : `${selectedService.price} USD`}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-lime-400/10 px-4 py-3 ring-1 ring-lime-300/30">
                          <p className="text-xs uppercase tracking-[0.18em] text-lime-200/70">Tipo</p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {serviceTypeLabels[(selectedService.service_type ?? "request") as keyof typeof serviceTypeLabels]?.label ?? "Pedido / Solicitud"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-4 rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Acción</p>
                        <h3 className="text-2xl font-bold text-white">
                          {serviceTypeLabels[(selectedService.service_type ?? "request") as keyof typeof serviceTypeLabels]?.action ?? "Pedir servicio"}
                        </h3>
                      </div>

                      <p className="text-sm leading-relaxed text-slate-300">
                        {selectedService.service_type === "purchase"
                          ? "Este servicio está listo para contratarse de forma directa. Te ayudamos a coordinar la compra y entrega del servicio."
                          : "Solicita este servicio y te contactaremos para confirmar detalles, tiempos y coordinación."}
                      </p>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button asChild variant="hero" className="flex-1 justify-center">
                          <Link to="/contacto">
                            {selectedService.service_type === "purchase" ? <ShoppingBag className="mr-2 h-4 w-4" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                            {selectedService.service_type === "purchase" ? "Comprar" : "Solicitar"}
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="flex-1 justify-center border-white/20 bg-transparent text-white hover:bg-white/5">
                          <Link to="/contacto">Más información</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </Reveal>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              {services.map((service, idx) => {
                const typeKey = (service.service_type ?? "request") as keyof typeof serviceTypeLabels;
                const typeMeta = serviceTypeLabels[typeKey] ?? serviceTypeLabels.request;
                const isSelected = selectedService?.id === service.id;

                return (
                  <Reveal key={service.id} delay={idx * 90} className="h-full">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedServiceId(service.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedServiceId(service.id);
                        }
                      }}
                      className={
                        isSelected
                          ? "h-full text-left rounded-[2rem] border border-lime-300/60 p-7 transition-all duration-200 cursor-pointer nc-liquid lift shadow-lg shadow-lime-400/10 glow-volt"
                          : "h-full text-left rounded-[2rem] border border-white/15 p-7 transition-all duration-200 cursor-pointer nc-liquid lift hover:border-lime-300/40"
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-lime-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-300">
                          {service.category ?? "General"}
                        </span>
                        <span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1 " + typeMeta.badgeClass}>
                          {typeMeta.label}
                        </span>
                      </div>

                      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white">{service.title}</h2>
                      <p className="mt-4 text-slate-300 leading-relaxed">{service.summary}</p>

                      <div className="mt-6 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-400">Precio</p>
                          <p className="text-2xl font-bold text-white">{service.currency === "CUP" ? `${service.price} CUP` : `${service.price} USD`}</p>
                        </div>
                        <Link
                          to={`/servicios/${service.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-[#a3e635] text-[#0c0c14] hover:bg-[#bef264] font-bold rounded-2xl transition-all"
                        >
                          Ver detalles <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>

                      {service.features && service.features.length > 0 && (
                        <div className="mt-6 space-y-2">
                          {service.features.slice(0, 3).map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-lime-300" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

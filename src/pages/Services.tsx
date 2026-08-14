import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Service } from "@/types";
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, ShoppingBag } from "lucide-react";

const serviceTypeLabels = {
  purchase: {
    label: "Compra",
    badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40",
    action: "Comprar servicio",
  },
  request: {
    label: "Pedido / Solicitud",
    badgeClass: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/40",
    action: "Pedir servicio",
  },
} as const;

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Servicios — NeoCharge";
  }, []);

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
        if (!selectedServiceId && nextServices.length > 0) {
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
    <div className="container-page py-12 md:py-20">
      <header className="mb-16 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          Servicios Profesionales
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight">
          Servicios de tecnología <br />y soporte técnico
        </h1>
        <p className="text-xl text-muted-foreground font-light max-w-3xl leading-relaxed">
          Descubre todo lo que hacemos más allá de la tienda: desarrollo de páginas web, programación, mantenimiento de SPLITS, reparaciones y soporte técnico especializado.
        </p>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-border bg-secondary/50 p-12 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Cargando servicios...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl border border-border bg-secondary/50 p-12 text-center">
          <h2 className="font-display text-3xl font-bold">No hay servicios publicados aún</h2>
          <p className="mt-3 text-muted-foreground">Pronto podrás ver aquí las opciones de mantenimiento, programación y soporte que ofrecemos.</p>
          <Button asChild variant="hero"><Link to="/contacto">Contáctanos</Link></Button>
        </div>
      ) : (
        <>
          {selectedService && (
            <section className="mb-10 overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl">
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
                      <p className="mt-1 text-2xl font-bold text-white">
                        {selectedService.currency === "CUP" ? `${selectedService.price} CUP` : `${selectedService.price} USD`}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary/15 px-4 py-3 ring-1 ring-primary/40">
                      <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/80">Tipo</p>
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
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {services.map((service) => {
              const typeKey = (service.service_type ?? "request") as keyof typeof serviceTypeLabels;
              const typeMeta = serviceTypeLabels[typeKey] ?? serviceTypeLabels.request;
              const isSelected = selectedService?.id === service.id;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`text-left rounded-[28px] border p-7 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border bg-white/80 hover:border-primary/40 hover:bg-primary/[0.03]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      {service.category ?? "General"}
                    </span>
                    <span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1 " + typeMeta.badgeClass}>
                      {typeMeta.label}
                    </span>
                  </div>

                  <h2 className="mt-4 font-display text-3xl font-bold tracking-tight">{service.title}</h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed">{service.summary}</p>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Precio</p>
                      <p className="text-2xl font-bold">{service.currency === "CUP" ? `${service.price} CUP` : `${service.price} USD`}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Ver detalles <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>

                  {service.features && service.features.length > 0 && (
                    <div className="mt-6 space-y-2">
                      {service.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

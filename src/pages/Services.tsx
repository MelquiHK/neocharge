import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Service } from "@/types";
import { Loader2 } from "lucide-react";

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

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
        setServices((data ?? []) as Service[]);
      }
      setLoading(false);
    };
    void load();
  }, []);

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
        <div className="grid gap-6 xl:grid-cols-2">
          {services.map((service) => (
            <div key={service.id} className="rounded-3xl border border-border bg-white/80 p-8 shadow-soft backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">{service.category ?? "General"}</span>
                <span className="text-sm text-muted-foreground">Orden {service.sort_order ?? 0}</span>
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight">{service.title}</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">{service.summary}</p>
              <div className="mt-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Precio</p>
                  <p className="text-2xl font-bold">{service.currency === "CUP" ? `${service.price} CUP` : `${service.price} USD`}</p>
                </div>
                <Button asChild variant="hero"><Link to="/contacto">Pedir servicio</Link></Button>
              </div>
              {service.features && service.features.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Incluye</h3>
                  <ul className="grid gap-2 text-sm text-muted-foreground">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2"><span className="mt-1 text-primary">•</span>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

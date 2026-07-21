import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Code, Globe, Wrench, Wind, MessageCircle, Star, Search, X,
  Smartphone, Cpu, Settings, Zap, Monitor, Hammer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/format";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Service, ServiceCategory } from "@/types";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe, Code, Wrench, Wind, Smartphone, Cpu, Settings, Zap, Monitor, Hammer,
};

function ServiceIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && iconMap[name]) ? iconMap[name] : Wrench;
  return <Icon className={className} />;
}

const Services = () => {
  useSEO("services");
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [catRes, svcRes] = await Promise.all([
        supabase.from("service_categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("services").select("*").eq("is_active", true).order("sort_order").order("created_at", { ascending: false }),
      ]);
      if (catRes.data) setCategories(catRes.data as ServiceCategory[]);
      if (svcRes.data) setServices(svcRes.data as Service[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...services];
    if (activeCat !== "all") {
      list = list.filter((s) => s.category_id === activeCat);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.short_description?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q),
      );
    }
    const featured = list.filter((s) => s.is_featured);
    const regular = list.filter((s) => !s.is_featured);
    featured.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    regular.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return [...featured, ...regular];
  }, [services, activeCat, search]);

  const openRequest = (service: Service) => {
    setSelectedService(service);
    setRequestOpen(true);
  };

  const handleWhatsApp = (service: Service) => {
    const priceText = service.price_label
      ? service.price_label
      : service.price != null
        ? formatPrice(Number(service.price), service.currency ?? "USD")
        : "Consultar precio";
    const text = [
      "🛠️ *SOLICITUD DE SERVICIO — NEOCHARGE*",
      "",
      `📋 *Servicio:* ${service.name}`,
      `💰 *Precio:* ${priceText}`,
      "",
      "Hola, me interesa este servicio. ¿Podemos coordinar?",
    ].join("\n");
    window.open(getWhatsAppLink(text), "_blank");
  };

  const submitRequest = async () => {
    if (!selectedService || !name.trim() || !phone.trim()) {
      toast.error("Completa nombre y teléfono");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("service_requests").insert({
      service_id: selectedService.id,
      user_id: user?.id ?? null,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_email: email.trim() || null,
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("No se pudo enviar la solicitud");
      return;
    }
    toast.success("Solicitud enviada. Te contactaremos pronto.");
    setRequestOpen(false);
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
    handleWhatsApp(selectedService);
  };

  return (
    <div className="container-page py-12 md:py-20">
      <header className="mb-16 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          Servicios Profesionales
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight">
          Más que una tienda, <br /><span className="text-gradient-accent">soluciones</span>
        </h1>
        <p className="text-xl text-muted-foreground font-light max-w-3xl leading-relaxed">
          Desarrollo web, programación, reparaciones, mantenimiento de splits y mucho más.
          Explora todo lo que hacemos además de vender electrónica.
        </p>
      </header>

      <div className="sticky top-24 z-30 mb-8">
        <div className="glass rounded-2xl p-3 flex flex-col md:flex-row gap-3 shadow-soft">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar servicios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11 rounded-xl border-0 bg-secondary/60"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setActiveCat("all")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold transition-all",
            activeCat === "all" ? "bg-foreground text-background shadow-soft" : "bg-secondary hover:bg-muted",
          )}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all inline-flex items-center gap-1.5",
              activeCat === c.id ? "bg-foreground text-background shadow-soft" : "bg-secondary hover:bg-muted",
            )}
          >
            <ServiceIcon name={c.icon} className="w-3.5 h-3.5" />
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Wrench className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="font-display text-xl font-bold">No hay servicios disponibles</h3>
          <p className="text-muted-foreground">Pronto añadiremos más opciones.</p>
          <Button asChild variant="outline"><Link to="/contacto">Contáctanos</Link></Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((service) => {
            const cat = categories.find((c) => c.id === service.category_id);
            const priceText = service.price_label
              ? service.price_label
              : service.price != null
                ? formatPrice(Number(service.price), service.currency ?? "USD")
                : "Consultar";

            return (
              <article
                key={service.id}
                className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
              >
                <div className="relative h-44 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 flex items-center justify-center">
                  {service.image_url ? (
                    <img src={service.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ServiceIcon name={cat?.icon} className="w-16 h-16 text-primary/40" />
                  )}
                  {service.is_featured && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Destacado
                    </span>
                  )}
                  {cat && (
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-background/80 text-xs font-semibold">
                      {cat.name}
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-display text-xl font-bold">{service.name}</h3>
                    {service.short_description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.short_description}</p>
                    )}
                  </div>

                  <p className="text-2xl font-bold text-primary">{priceText}</p>

                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{service.description}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="hero" className="flex-1" onClick={() => openRequest(service)}>
                      Solicitar
                    </Button>
                    <Button variant="whatsapp" size="icon" onClick={() => handleWhatsApp(service)} aria-label="WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Solicitar servicio</DialogTitle>
            <DialogDescription>
              {selectedService?.name} — completa tus datos y te contactaremos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+53..." />
            </div>
            <div className="space-y-2">
              <Label>Correo (opcional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Cuéntanos qué necesitas..." className="min-h-[100px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRequestOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={submitRequest} disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;

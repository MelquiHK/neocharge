import { useState } from "react";
import { Mail, MapPin, MessageCircle, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { useSEO } from "@/hooks/use-seo";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";
import "@/components/sections/visual-effects.css";

const Contact = () => {
  useSEO("contact");
  const { settings } = useSiteSettings();
  const { ref, visible } = useReveal();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) { toast.error("Completa nombre y mensaje"); return; }
    const text = `Hola, soy ${name} (${email}).\n\n${message}`;
    window.open(getWhatsAppLink(text), "_blank");
    toast.success("Te llevamos a WhatsApp para enviar tu mensaje");
  };

  const whatsappUrl = settings.whatsapp_url ?? "https://wa.me/5363180910";
  const phone = settings.support_phone ?? "+53 6318-0910";
  const emailValue = settings.support_email ?? "neocharge0@gmail.com";
  const address = settings.support_address ?? "D entre 21 y 23, Vedado, La Habana";
  const hours = settings.support_hours ?? "Atención 24 horas, todos los días";

  const cards = [
    {
      icon: Mail,
      title: "Correo",
      value: emailValue,
      href: `mailto:${emailValue}`,
      accent: false,
    },
    {
      icon: MapPin,
      title: "Local",
      value: address,
      href: undefined,
      accent: false,
    },
    {
      icon: Clock,
      title: "Horario",
      value: hours,
      href: undefined,
      accent: false,
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Lavados de color + orbes */}
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-brand-300/30 blur-[130px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-brand-200/25 blur-[120px] pointer-events-none"
        aria-hidden
      />

      <div ref={ref} className={cn("relative container-page py-14 md:py-24 reveal", visible && "is-visible")}>
        {/* Hero */}
        <header className="text-center max-w-3xl mx-auto mb-14 md:mb-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-brand-800 text-xs font-bold uppercase tracking-[0.2em]">
            Contacto Directo
          </div>
          <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight nc-title-gradient">
            Hablemos
          </h1>
          <p className="text-xl text-muted-foreground font-light leading-relaxed">
            Estamos disponibles <span className="font-semibold text-brand-800">24 horas</span> para resolver tus dudas. <br className="hidden md:block" />
            Elige el canal que prefieras y te responderemos al instante.
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 items-start">
          {/* Tarjetas de contacto */}
          <div className="space-y-4">
            {/* WhatsApp / Teléfono: una sola tarjeta, es el mismo número */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-5 sm:p-6 rounded-[1.75rem] glass border-emerald-200/70 hover:border-emerald-400/60 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-13 h-13 p-3 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100 border border-emerald-200 text-emerald-600">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-bold">
                    WhatsApp / Teléfono
                  </p>
                  <p className="font-bold text-foreground text-lg mt-0.5">
                    {phone}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 rounded-full px-4 py-2 whitespace-nowrap group-hover:bg-emerald-200/60 transition-colors">
                  Escríbenos
                </span>
              </div>
            </a>

            {cards.map((c, i) => {
              const inner = (
                <div className="flex items-center gap-4">
                  <div className="nc-icon-tile w-13 h-13 p-3">
                    <c.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-bold">{c.title}</p>
                    <p className="font-semibold text-foreground mt-0.5 break-words">{c.value}</p>
                  </div>
                </div>
              );
              return c.href ? (
                <a
                  key={i}
                  href={c.href}
                  className="block p-5 sm:p-6 rounded-[1.75rem] glass hover:border-brand-300 transition-all duration-300 hover:-translate-y-1"
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={i}
                  className="block p-5 sm:p-6 rounded-[1.75rem] glass"
                >
                  {inner}
                </div>
              );
            })}
          </div>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            className="glass-strong rounded-[2rem] p-7 sm:p-9 space-y-5"
          >
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight nc-title-gradient">Envíanos un mensaje</h2>
              <p className="text-sm text-muted-foreground mt-1.5 font-light">
                Te llevamos directo a nuestro WhatsApp con tu mensaje listo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cn" className="text-slate-700 font-medium">Nombre</Label>
              <Input
                id="cn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Tu nombre"
                autoComplete="name"
                className="nc-input h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ce" className="text-slate-700 font-medium">Correo</Label>
              <Input
                id="ce"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="opcional"
                autoComplete="email"
                className="nc-input h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cm" className="text-slate-700 font-medium">Mensaje</Label>
              <Textarea
                id="cm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="nc-input min-h-[140px]"
                placeholder="¿En qué te ayudamos?"
              />
            </div>
            <Button
              type="submit"
              variant="whatsapp"
              size="lg"
              className="w-full h-13 rounded-2xl text-base font-bold nc-btn-shine"
            >
              <Send className="w-4 h-4 mr-2" /> Enviar por WhatsApp
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;

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
  const emailValue = settings.support_email ?? "habanasound90@gmail.com";
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
    <div className="relative overflow-hidden bg-[#070d20]">
      {/* Lavados de color + orbes */}
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"
        aria-hidden
      />

      <div ref={ref} className={cn("relative container-page py-14 md:py-24 reveal", visible && "is-visible")}>
        {/* Hero */}
        <header className="text-center max-w-3xl mx-auto mb-14 md:mb-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 nc-liquid text-cyan-200 text-xs font-bold uppercase tracking-[0.2em]">
            Contacto Directo
          </div>
          <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight text-white">
            Hablemos
          </h1>
          <p className="text-xl text-slate-300 font-light leading-relaxed">
            Estamos disponibles <span className="font-semibold text-white">24 horas</span> para resolver tus dudas. <br className="hidden md:block" />
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
              className="group block p-5 sm:p-6 rounded-[1.75rem] border border-emerald-300/30 nc-liquid hover:border-emerald-300/60 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-13 h-13 p-3 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-400/20 border border-emerald-300/30 text-emerald-300">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300 font-bold">
                    WhatsApp / Teléfono
                  </p>
                  <p className="font-bold text-white text-lg mt-0.5">
                    {phone}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-200 bg-emerald-400/15 border border-emerald-300/25 rounded-full px-4 py-2 whitespace-nowrap group-hover:bg-emerald-400/25 transition-colors">
                  Escríbenos
                </span>
              </div>
            </a>

            {cards.map((c, i) => {
              const inner = (
                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 p-3 rounded-2xl flex items-center justify-center shrink-0 bg-white/10 border border-white/20 text-cyan-300">
                    <c.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300 font-bold">{c.title}</p>
                    <p className="font-semibold text-white mt-0.5 break-words">{c.value}</p>
                  </div>
                </div>
              );
              return c.href ? (
                <a
                  key={i}
                  href={c.href}
                  className="block p-5 sm:p-6 rounded-[1.75rem] border border-white/20 nc-liquid hover:border-white/40 transition-all duration-300 hover:-translate-y-1"
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={i}
                  className="block p-5 sm:p-6 rounded-[1.75rem] border border-white/20 nc-liquid"
                >
                  {inner}
                </div>
              );
            })}
          </div>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-white/25 nc-liquid nc-sheen p-7 sm:p-9 space-y-5 shadow-2xl"
          >
            <div>
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">Envíanos un mensaje</h2>
              <p className="text-sm text-slate-300 mt-1.5 font-light">
                Te llevamos directo a nuestro WhatsApp con tu mensaje listo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cn" className="text-slate-200 font-medium">Nombre</Label>
              <Input
                id="cn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Tu nombre"
                autoComplete="name"
                className="h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ce" className="text-slate-200 font-medium">Correo</Label>
              <Input
                id="ce"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="opcional"
                autoComplete="email"
                className="h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cm" className="text-slate-200 font-medium">Mensaje</Label>
              <Textarea
                id="cm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="min-h-[140px] rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60"
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

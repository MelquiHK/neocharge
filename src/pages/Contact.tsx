import { useState } from "react";
import { Mail, MapPin, MessageCircle, Phone, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { useSEO } from "@/hooks/use-seo";
import { useSiteSettings } from "@/hooks/use-site-settings";

const Contact = () => {
  useSEO("contact");
  const { settings } = useSiteSettings();
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

  return (
    <div className="container-page py-12 md:py-24">
      <header className="text-center max-w-3xl mx-auto mb-20 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          Contacto Directo
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight">Hablemos</h1>
        <p className="text-xl text-muted-foreground font-light leading-relaxed">
          Estamos disponibles las 24 horas para resolver tus dudas. <br className="hidden md:block" />
          Elige el canal que prefieras y te responderemos al instante.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10">
        <div className="space-y-4">
          {[
            { icon: MessageCircle, title: "WhatsApp", value: settings.support_phone ?? "+53 6318-0910", href: settings.whatsapp_url ?? "https://wa.me/5363180910", accent: true },
            { icon: Phone, title: "Teléfono", value: settings.support_phone ?? "+53 6318-0910", href: `tel:${settings.support_phone?.replace(/\s+/g, "") ?? "+5363180910"}` },
            { icon: Mail, title: "Correo", value: settings.support_email ?? "habanasound90@gmail.com", href: `mailto:${settings.support_email ?? "habanasound90@gmail.com"}` },
            { icon: MapPin, title: "Local", value: settings.support_address ?? "D entre 21 y 23, Vedado, La Habana" },
            { icon: Clock, title: "Horario", value: settings.support_hours ?? "Atención 24 horas, todos los días" },
          ].map((c, i) => (
            <a
              key={i}
              href={c.href}
              target={c.href?.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`block p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-soft transition-all ${c.accent ? "bg-accent/5 border-accent/20" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.accent ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                  <c.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{c.title}</p>
                  <p className="font-semibold text-foreground">{c.value}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card-elevated p-8 space-y-4">
          <h2 className="font-display text-2xl font-bold">Envíanos un mensaje</h2>
          <div className="space-y-2">
            <Label htmlFor="cn">Nombre</Label>
            <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Tu nombre" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce">Correo</Label>
            <Input id="ce" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cm">Mensaje</Label>
            <Textarea id="cm" value={message} onChange={(e) => setMessage(e.target.value)} required className="min-h-[140px] rounded-xl" placeholder="¿En qué te ayudamos?" />
          </div>
          <Button type="submit" variant="whatsapp" size="lg" className="w-full">
            <Send className="w-4 h-4" /> Enviar por WhatsApp
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Contact;

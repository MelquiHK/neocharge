import { useEffect, useState } from "react";
import { Mail, MapPin, MessageCircle, Phone, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getWhatsAppLink } from "@/lib/whatsapp";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.title = "Contacto — Neocharge";
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) { toast.error("Completa nombre y mensaje"); return; }
    const text = `Hola, soy ${name} (${email}).\n\n${message}`;
    window.open(getWhatsAppLink(text), "_blank");
    toast.success("Te llevamos a WhatsApp para enviar tu mensaje");
  };

  return (
    <div className="container-page py-12 md:py-20">
      <header className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary">Contacto</span>
        <h1 className="font-display text-5xl font-bold">Hablemos</h1>
        <p className="text-muted-foreground text-lg">Estamos disponibles las 24 horas. Elige el canal que prefieras.</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10">
        <div className="space-y-4">
          {[
            { icon: MessageCircle, title: "WhatsApp", value: "+53 6318-0910", href: "https://wa.me/5363180910", accent: true },
            { icon: Phone, title: "Teléfono", value: "+53 6318-0910", href: "tel:+5363180910" },
            { icon: Mail, title: "Correo", value: "hola@neocharge.cu", href: "mailto:hola@neocharge.cu" },
            { icon: MapPin, title: "Local", value: "D entre 21 y 23, Vedado, La Habana" },
            { icon: Clock, title: "Horario", value: "Atención 24 horas, todos los días" },
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

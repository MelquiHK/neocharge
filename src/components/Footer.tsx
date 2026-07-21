import { Link } from "react-router-dom";
import { Facebook, MapPin, Phone, Clock, Mail, Send } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Introduce un correo válido");
      return;
    }
    toast.success("¡Gracias por suscribirte! Te avisaremos de novedades.");
    setEmail("");
  };

  return (
    <footer className="relative mt-32 border-t border-border bg-secondary/30">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Newsletter band */}
      <div className="container-page pt-16 pb-12">
        <div className="rounded-3xl bg-gradient-primary p-8 md:p-12 shadow-glow text-primary-foreground overflow-hidden relative">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-primary-glow/40 blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Novedades y Ofertas
              </h3>
              <p className="text-primary-foreground/85 text-base md:text-lg">
                Recibe ofertas exclusivas, nuevos productos y consejos directo en tu correo.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full">
              <Input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/95 text-foreground border-0 h-12 rounded-full px-5 placeholder:text-muted-foreground"
              />
              <Button type="submit" variant="electric" size="lg" className="shrink-0">
                <Send className="w-4 h-4" /> Suscribirme
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="container-page pb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tu tienda de electrónica de confianza en La Habana. Calidad certificada, garantía y entrega 24 horas.
            </p>
            <div className="flex gap-2 pt-2">
              <a
                href="https://www.facebook.com/melquisedec.dominguez.9"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/5363180910"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-foreground">Tienda</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/tienda" className="text-muted-foreground hover:text-primary transition-colors">Todos los productos</Link></li>
              <li><Link to="/tienda?cat=cargadores" className="text-muted-foreground hover:text-primary transition-colors">Cargadores</Link></li>
              <li><Link to="/tienda?cat=cables" className="text-muted-foreground hover:text-primary transition-colors">Cables</Link></li>
              <li><Link to="/tienda?cat=baterias" className="text-muted-foreground hover:text-primary transition-colors">Baterías</Link></li>
              <li><Link to="/tienda?cat=accesorios" className="text-muted-foreground hover:text-primary transition-colors">Accesorios</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-foreground">Información</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/sobre-nosotros" className="text-muted-foreground hover:text-primary transition-colors">Sobre nosotros</Link></li>
              <li><Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="/garantia" className="text-muted-foreground hover:text-primary transition-colors">Garantía</Link></li>
              <li><Link to="/legales/terminos" className="text-muted-foreground hover:text-primary transition-colors">Términos</Link></li>
              <li><Link to="/legales/privacidad" className="text-muted-foreground hover:text-primary transition-colors">Privacidad</Link></li>
              <li><Link to="/contacto" className="text-muted-foreground hover:text-primary transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-foreground">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>D entre 21 y 23, Vedado, La Habana</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-primary" />
                <a href="tel:+5363180910" className="text-muted-foreground hover:text-primary transition-colors">+53 6318-0910</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-primary" />
                <a href="mailto:habanasound90@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">habanasound90@gmail.com</a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0 text-primary" />
                <span>Atención 24 horas</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NeoCharge · Hecho con amor en La Habana 🇨🇺
          </p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <Link to="/legales/terminos" className="hover:text-primary transition-colors">Términos</Link>
            <Link to="/legales/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

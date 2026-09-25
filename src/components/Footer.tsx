import { Link } from "react-router-dom";
import { Facebook, MapPin, Phone, Clock, Mail, MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const WHATSAPP_URL =
  "https://wa.me/5363180910?text=" +
  encodeURIComponent("Hola NeoCharge, quiero recibir sus novedades y ofertas.");

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-border bg-secondary/30">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Banda de contacto directo por WhatsApp.
          (Antes había un "newsletter" que no guardaba los correos en ningún lado:
          se reemplazó por un CTA honesto al WhatsApp del negocio.) */}
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
                Escríbenos por WhatsApp y te avisamos de ofertas exclusivas,
                nuevos productos y consejos.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Button asChild variant="electric" size="lg" className="h-12 rounded-full px-6">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" /> Escríbenos por WhatsApp
                </a>
              </Button>
            </div>
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

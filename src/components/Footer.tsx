import { Link } from "react-router-dom";
import { Facebook, MapPin, Phone, Clock, Mail, MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const WHATSAPP_URL =
  "https://wa.me/5363180910?text=" +
  encodeURIComponent("Hola NeoCharge, quiero recibir sus novedades y ofertas.");

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-white/60 bg-white/50 backdrop-blur-xl">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />

      {/* Banda de contacto directo por WhatsApp.
          (Antes había un "newsletter" que no guardaba los correos en ningún lado:
          se reemplazó por un CTA honesto al WhatsApp del negocio.) */}
      <div className="container-page pt-16 pb-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-grape-700 to-brand-900 p-8 md:p-12 shadow-glow-brand text-white">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-grape-300/40 blur-3xl" aria-hidden />
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Ofertas directas
              </span>
              <h3 className="nc-display text-3xl md:text-[2.75rem] text-white">
                Novedades y ofertas, sin spam
              </h3>
              <p className="text-white/85 text-base md:text-lg font-light max-w-lg">
                Escríbenos por WhatsApp y te avisamos de ofertas exclusivas,
                nuevos productos y consejos.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Button asChild size="lg" className="rounded-2xl px-7 py-4 bg-white text-brand-700 font-bold shadow-xl hover:bg-brand-50 hover:-translate-y-0.5 transition-all duration-300 text-base">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
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
              <li><Link to="/preguntas-frecuentes" className="text-muted-foreground hover:text-primary transition-colors">Preguntas frecuentes</Link></li>
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

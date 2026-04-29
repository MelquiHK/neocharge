import { useEffect } from "react";
import { Award, Heart, MapPin, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const About = () => {
  useEffect(() => {
    document.title = "Sobre nosotros — Neocharge";
  }, []);

  return (
    <div>
      <section className="container-page py-12 md:py-20">
        <div className="max-w-3xl space-y-6">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Sobre nosotros
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-bold leading-tight">
            Nuestro <span className="text-gradient">propósito</span> en La Habana
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Ventas de equipos de electronica, con calidad y atención que se siente.
          </p>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Que queremos", text: "Hacer que cada habanero tenga acceso a tecnología de carga confiable, sin pagar de más ni jugársela con falsificaciones." },
            { icon: Heart, title: "Nuestros valores", text: "Honestidad, calidad y servicio personal. Probamos cada producto frente a ti y respondemos por lo que vendemos." },
            { icon: Sparkles, title: "Nuestra promesa", text: "Si algo falla en 24h lo cambiamos. Si tienes dudas a las 2am, te respondemos. Así de simple." },
          ].map((b, i) => (
            <div key={i} className="card-elevated p-7">
              <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-soft">
                <b.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">{b.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 py-20">
        <div className="container-page grid md:grid-cols-3 gap-8 text-center">
          {[
            { icon: Users, n: "1000+", l: "Clientes felices" },
            { icon: Award, n: "Se prueba frente a ti", l: "Garantía en todo" },
            { icon: MapPin, n: "24h", l: "Entrega en La Habana" },
          ].map((s, i) => (
            <div key={i} className="space-y-2">
              <s.icon className="w-8 h-8 text-primary mx-auto" />
              <p className="font-display text-5xl font-bold text-gradient">{s.n}</p>
              <p className="text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-20 text-center space-y-6 max-w-2xl">
        <h2 className="font-display text-4xl font-bold">¿Conversamos?</h2>
        <p className="text-muted-foreground text-lg">
          Visítanos en D entre 21 y 23, Vedado, o escríbenos por WhatsApp.
        </p>
        <Button asChild variant="hero" size="lg">
          <Link to="/contacto">Contáctanos</Link>
        </Button>
      </section>
    </div>
  );
};

export default About;

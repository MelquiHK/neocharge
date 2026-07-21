import { Award, Heart, MapPin, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/use-seo";

const About = () => {
  useSEO("about");

  return (
    <div>
      <section className="container-page py-20 md:py-32">
        <div className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
            Sobre NeoCharge
          </div>
          <h1 className="font-display text-6xl md:text-8xl font-bold leading-[1.05] tracking-tighter">
            Tienda <br /><span className="text-gradient-accent">de electronica</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-light max-w-2xl">
            No solo vendemos electrónica; construimos confianza a través de la calidad y el soporte técnico real que nuestra comunidad merece.
          </p>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Qué queremos", text: "Facilitar el acceso a tecnología de carga confiable en La Habana, eliminando el riesgo de productos falsificados." },
            { icon: Heart, title: "Nuestros valores", text: "Honestidad, calidad y servicio personal. Probamos cada producto frente a ti y respondemos por lo que vendemos." },
            { icon: Sparkles, title: "Nuestra promesa", text: "Si algo falla en 24h lo cambiamos. Si tienes dudas a las 2 am, te respondemos. Así de simple." },
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

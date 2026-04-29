import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import chargerImg from "@/assets/charger-clean.png";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* Floating glow */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-radial-glow animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-radial-glow opacity-50 animate-pulse-glow pointer-events-none" style={{ animationDelay: "2s" }} />

      <div className="container-page relative pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="space-y-6 lg:space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Bienvenido amigo/a
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Tienda de <span className="text-gradient">electronica</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Venta de todo tipo de productos de electronica.
              Calidad certificada con entrega 24h en La Habana.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild variant="hero" size="xl">
                <Link to="/tienda">
                  Comprar ahora <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/sobre-nosotros">Conocernos</Link>
              </Button>
            </div>

            {/* Mini features */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border max-w-lg">
              {[
                { icon: ShieldCheck, label: "Garantía para su seguridad" },
                { icon: Truck, label: "Entrega en 24h" },
                { icon: Zap, label: "Carga rapida y protegida" },
              ].map((f, i) => (
                <div key={i} className="space-y-1.5">
                  <f.icon className="w-5 h-5 text-primary" />
                  <p className="text-xs font-medium text-foreground/80 leading-tight">{f.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual - Brand Name Display */}
          <div className="relative animate-scale-in">
            <div className="relative aspect-square max-w-lg mx-auto flex items-center justify-center">
              {/* Glow rings */}
              <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-20 blur-3xl animate-pulse-glow" />
              <div className="absolute inset-8 rounded-full border border-primary/20" />
              <div className="absolute inset-16 rounded-full border border-accent/20" />

              {/* Spinning ring */}
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-primary/30 animate-spin-slow" />

              {/* Brand Name */}
              <div className="relative z-10 text-center animate-float">
                <h2 className="font-display text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
                  <span className="text-gradient">Neo</span>
                  <span className="text-foreground">charge</span>
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-medium tracking-wide">
                  Calidad Precio, Pruebanos
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Nuestra prioridad es usted</span>
                </div>
              </div>

              {/* Floating tags */}
              <div className="absolute top-8 -left-2 md:-left-8 glass rounded-2xl px-4 py-2.5 shadow-elevated animate-float" style={{ animationDelay: "1s" }}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Productos</p>
                <p className="text-lg font-display font-bold text-primary">50+</p>
              </div>
              <div className="absolute bottom-12 -right-2 md:-right-8 glass rounded-2xl px-4 py-2.5 shadow-elevated animate-float" style={{ animationDelay: "2s" }}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Soporte</p>
                <p className="text-lg font-display font-bold text-accent">24/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

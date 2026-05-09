import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Truck, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Dynamic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Animated gradient blobs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/30 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/30 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-radial-gradient opacity-50 pointer-events-none" />

      <div className="container-page relative py-20 md:py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all duration-300">
              <div className="relative flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 animate-spin-slow" />
                <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Bienvenido a Neocharge
                </span>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1]">
                <span className="block text-white">Tienda de</span>
                <span className="block bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 text-transparent bg-clip-text">
                  Electrónica
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed font-light">
                Descubre productos de electrónica de calidad certificada con entrega rápida en La Habana. 
                Soporte 24/7 y garantía completa en cada compra.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg">
                <Link to="/tienda" className="flex items-center gap-2">
                  Explorar Tienda
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/25 bg-white/5 text-white backdrop-blur-md hover:bg-white/10 hover:border-white/40 shadow-soft hover:shadow-elevated"
              >
                <Link to="/sobre-nosotros">Conocer Más</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
              {[
                { number: "50+", label: "Productos" },
                { number: "24/7", label: "Soporte" },
                { number: "100%", label: "Garantía" },
              ].map((stat, i) => (
                <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                  <p className="text-2xl md:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    {stat.number}
                  </p>
                  <p className="text-xs md:text-sm text-slate-400 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Features List */}
            <div className="space-y-3 pt-4">
              {[
                { icon: ShieldCheck, text: "Garantía 100% segura" },
                { icon: Truck, text: "Envío en 24 horas" },
                { icon: Zap, text: "Soporte inmediato" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 animate-fade-in-left" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
                    <feature.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-slate-300 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual - Premium Display */}
          <div className="relative h-full min-h-[500px] hidden lg:flex items-center justify-center perspective">
            {/* Main gradient orb */}
            <div className="animate-fade-in-right" style={{ animationDelay: "0.2s" }}>
              <div className="relative w-full max-w-md aspect-square">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 via-purple-500/20 to-pink-500/40 rounded-full filter blur-3xl opacity-60 animate-pulse-glow"></div>
                
                {/* Animated rings */}
                <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-spin-slow"></div>
                <div className="absolute inset-8 rounded-full border border-purple-500/30 animate-spin-slower" style={{ animationDirection: "reverse" }}></div>
                <div className="absolute inset-16 rounded-full border border-cyan-500/20"></div>

                {/* Center glass card */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-4/5 h-4/5 rounded-3xl glass bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-lifted flex items-center justify-center overflow-hidden group hover:shadow-card-hover transition-all duration-500">
                    {/* Animated gradient border */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-purple-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                      background: "linear-gradient(45deg, rgba(59,130,246,0) 0%, rgba(168,85,247,0.3) 50%, rgba(34,211,238,0) 100%)",
                      animation: "gradient-shift 3s ease infinite"
                    }}></div>

                    {/* Content */}
                    <div className="relative z-10 text-center space-y-4">
                      <div className="text-6xl md:text-7xl font-display font-bold">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                          Neo
                        </span>
                        <span className="text-white">charge</span>
                      </div>
                      <p className="text-sm text-slate-300 font-medium">Calidad. Precio. Confianza.</p>
                      <div className="flex justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 glass rounded-2xl px-4 py-3 shadow-elevated animate-float border border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Productos</p>
                  <p className="text-xl font-display font-bold text-blue-400">50+</p>
                </div>
                <div className="absolute -bottom-4 -left-4 glass rounded-2xl px-4 py-3 shadow-elevated animate-float border border-white/10" style={{ animationDelay: "1.5s" }}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Rating</p>
                  <p className="text-xl font-display font-bold text-purple-400">4.9★</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent pointer-events-none"></div>
    </section>
  );
}

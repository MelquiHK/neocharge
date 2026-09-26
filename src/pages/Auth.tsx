import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import "@/components/sections/visual-effects.css";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const nextDestination = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("next") ?? "/cuenta";
  }, [location.search]);

  useSEO("auth");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedMode = searchParams.get("mode");
    if (requestedMode === "signup" || requestedMode === "login") {
      setMode(requestedMode);
    }
  }, [location.search]);

  useEffect(() => {
    if (user) navigate(nextDestination);
  }, [user, navigate, nextDestination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const message = error.message ?? "No se pudo iniciar sesión.";
          console.error("Login failed:", message);
          toast.error(message);
          return;
        }
        toast.success("¡Bienvenido de nuevo!");
        navigate(nextDestination);
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: name, username: email.split("@")[0] },
          },
        });
        if (error) {
          const message = error.message ?? "No se pudo crear la cuenta.";
          console.error("Signup failed:", message);
          toast.error(message);
          return;
        }
        toast.success("¡Cuenta creada! Revisa tu correo para confirmar.");
        navigate(nextDestination);
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      const message = (err instanceof Error ? err.message : null) ?? "Error al procesar la solicitud";
      if (message.includes("already")) {
        toast.error("Este correo ya está registrado. Intenta iniciar sesión.");
      } else if (message.includes("password")) {
        toast.error("La contraseña debe tener al menos 6 caracteres.");
      } else if (message.includes("email")) {
        toast.error("El correo no es válido.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#070d20]">
      {/* Lavados de color + orbes */}
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-52 -left-32 w-[480px] h-[480px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"
        aria-hidden
      />

      <div className="relative container-page py-10 md:py-16">
        <div className="max-w-md mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>

          {/* Tarjeta de vidrio líquido */}
          <div className="rounded-[2.5rem] border border-white/25 nc-liquid nc-sheen p-8 sm:p-10 shadow-2xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-lg mb-1">
                <Logo showText={false} />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">
                {mode === "login" ? "¡Hola de nuevo!" : "Únete a NeoCharge"}
              </h1>
              <p className="text-base text-slate-300 font-light leading-relaxed">
                {mode === "login"
                  ? "Entra para gestionar tus compras y favoritos."
                  : "Crea tu cuenta y vive la experiencia premium."}
              </p>
            </div>

            {/* Tabs píldora de vidrio */}
            <div
              className="grid grid-cols-2 gap-1 p-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl mt-8"
              role="tablist"
              aria-label="Modo de autenticación"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => setMode("login")}
                className={cn(
                  "py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                  mode === "login"
                    ? "bg-white text-slate-950 shadow-lg"
                    : "text-slate-300 hover:text-white",
                )}
              >
                <LogIn className="w-4 h-4" /> Iniciar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => setMode("signup")}
                className={cn(
                  "py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                  mode === "signup"
                    ? "bg-white text-slate-950 shadow-lg"
                    : "text-slate-300 hover:text-white",
                )}
              >
                <UserPlus className="w-4 h-4" /> Crear cuenta
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-7">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200 font-medium">Nombre completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Juan Pérez"
                    autoComplete="name"
                    className="h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 font-medium">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  className="h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200 font-medium">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/60"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-13 rounded-2xl bg-white text-slate-950 hover:bg-blue-50 font-bold text-base nc-btn-shine shadow-xl transition-all duration-300 hover:-translate-y-0.5 disabled:translate-y-0"
                disabled={loading}
              >
                {loading ? "Procesando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </Button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed">
              Comprar como invitado también es posible —<br />puedes hacer pedidos sin cuenta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

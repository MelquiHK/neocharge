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
    <div className="relative overflow-hidden">
      {/* Lavados de color + orbes */}
      <div className="nc-wash-a" aria-hidden />
      <div className="nc-wash-b" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-brand-300/30 blur-[130px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-52 -left-32 w-[480px] h-[480px] rounded-full bg-brand-200/25 blur-[120px] pointer-events-none"
        aria-hidden
      />

      <div className="relative container-page py-10 md:py-16">
        <div className="max-w-md mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-700 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>

          {/* Tarjeta de vidrio líquido */}
          <div className="glass-strong rounded-[2.5rem] p-8 sm:p-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="nc-icon-tile rounded-3xl p-4 mb-1">
                <Logo showText={false} />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight nc-title-gradient">
                {mode === "login" ? "¡Hola de nuevo!" : "Únete a NeoCharge"}
              </h1>
              <p className="text-base text-muted-foreground font-light leading-relaxed">
                {mode === "login"
                  ? "Entra para gestionar tus compras y favoritos."
                  : "Crea tu cuenta y vive la experiencia premium."}
              </p>
            </div>

            {/* Tabs píldora de vidrio */}
            <div
              className="grid grid-cols-2 gap-1 p-1.5 rounded-full glass mt-8"
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
                    ? "bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-glow-brand-sm"
                    : "text-muted-foreground hover:text-brand-800",
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
                    ? "bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-glow-brand-sm"
                    : "text-muted-foreground hover:text-brand-800",
                )}
              >
                <UserPlus className="w-4 h-4" /> Crear cuenta
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-7">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 font-medium">Nombre completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Juan Pérez"
                    autoComplete="name"
                    className="nc-input h-12"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  className="nc-input h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="nc-input h-12"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="nc-btn-primary w-full h-13 text-base nc-btn-shine"
                disabled={loading}
              >
                {loading ? "Procesando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
              Comprar como invitado también es posible —<br />puedes hacer pedidos sin cuenta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

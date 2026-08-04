import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

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
    } catch (err: any) {
      console.error("Auth error:", err);
      const message = err.message ?? "Error al procesar la solicitud";
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
    <div className="container-page py-12">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>

        <div className="card-elevated p-10 space-y-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-3xl bg-primary/10 mb-2">
              <Logo showText={false} />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {mode === "login" ? "¡Hola de nuevo!" : "Únete a NeoCharge"}
            </h1>
            <p className="text-base text-muted-foreground text-center font-light">
              {mode === "login"
                ? "Entra para gestionar tus compras y favoritos."
                : "Crea tu cuenta y vive la experiencia premium."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-secondary rounded-full">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "py-2 rounded-full text-sm font-semibold transition-all",
                mode === "login" ? "bg-card shadow-soft" : "text-muted-foreground",
              )}
            >
              Iniciar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={cn(
                "py-2 rounded-full text-sm font-semibold transition-all",
                mode === "signup" ? "bg-card shadow-soft" : "text-muted-foreground",
              )}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Juan Pérez" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Procesando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Comprar como invitado también es posible — puedes hacer pedidos sin cuenta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

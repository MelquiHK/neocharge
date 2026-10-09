import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Settings as SettingsIcon,
  Wifi,
  User,
  Bell,
  LogOut,
  Trash2,
  ChevronRight,
  Phone,
  MapPin,
  Save,
  Heart,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useDataSaver } from "@/lib/data-saver";
import { PREFERRED_CURRENCY_KEY } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCubanPhone } from "@/lib/cuban-phone";
import { showBrowserNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BLOG_NOTIF_KEY = "nc-notif-blog";
const STOCK_NOTIF_KEY = "nc-notif-stock";
const BLOG_DISMISSED_KEY = "neocharge-blog-notif-dismissed";
export const DELIVERY_ADDRESS_KEY = "nc-delivery-address";

function readLS(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento */
  }
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-6 border-white/70 space-y-5">
      <div className="flex items-center gap-3">
        <span className="nc-icon-tile-sm shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export default function Settings() {
  useSEO("settings");

  const { user, profile, refreshProfile, signOut } = useAuth();
  const { paymentCurrency, setPaymentCurrency } = useCart();
  const [dataSaver, setDataSaver] = useDataSaver();

  // --- Moneda preferida (sincronizada con el carrito) ---
  const [currency, setCurrency] = useState<"USD" | "CUP">(paymentCurrency);
  useEffect(() => setCurrency(paymentCurrency), [paymentCurrency]);
  const changeCurrency = (c: "USD" | "CUP") => {
    setCurrency(c);
    writeLS(PREFERRED_CURRENCY_KEY, c);
    setPaymentCurrency(c);
    toast.success(`Moneda preferida: ${c}`);
  };

  // --- Perfil ---
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
    setAddress(readLS(DELIVERY_ADDRESS_KEY, ""));
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;
    const normalizedPhone = normalizeCubanPhone(phone);
    if (!normalizedPhone) {
      toast.error("El teléfono es obligatorio: usa tu móvil cubano de 8 dígitos (ej: 5842 7265).");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: normalizedPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      writeLS(DELIVERY_ADDRESS_KEY, address.trim());
      await refreshProfile();
      toast.success("Perfil guardado correctamente");
    } catch (err) {
      toast.error("No se pudo guardar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // --- Notificaciones ---
  const [blogNotif, setBlogNotif] = useState(() => readLS(BLOG_NOTIF_KEY, "1") === "1");
  const [stockNotif, setStockNotif] = useState(() => readLS(STOCK_NOTIF_KEY, "1") === "1");

  const toggleBlogNotif = async (on: boolean) => {
    if (on) {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") {
            toast.error("Activa el permiso en tu navegador para recibir avisos.");
            return;
          }
        }
      }
      writeLS(BLOG_NOTIF_KEY, "1");
      // Quitar el "descartado" del banner del blog para que pueda volver a ofrecerse.
      try {
        window.localStorage.removeItem(BLOG_DISMISSED_KEY);
      } catch {
        /* sin almacenamiento */
      }
      await showBrowserNotification("📝 Notificaciones activadas", {
        body: "Recibirás avisos cuando haya artículos nuevos en el blog.",
      });
    } else {
      writeLS(BLOG_DISMISSED_KEY, "1");
    }
    writeLS(BLOG_NOTIF_KEY, on ? "1" : "0");
    setBlogNotif(on);
  };

  const toggleStockNotif = (on: boolean) => {
    writeLS(STOCK_NOTIF_KEY, on ? "1" : "0");
    setStockNotif(on);
    toast.success(on ? "Alertas de stock activadas" : "Alertas de stock desactivadas");
  };

  // --- Datos locales ---
  const clearLocalData = () => {
    if (!window.confirm("¿Borrar el carrito y las preferencias guardadas en este dispositivo?")) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("nc-")) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* noop */
    }
    toast.success("Datos locales borrados");
    window.location.reload();
  };

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <span className="nc-icon-tile">
          <SettingsIcon className="w-6 h-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold">Ajustes</h1>
          <p className="text-sm text-muted-foreground">Personaliza tu experiencia en NeoCharge</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Comodidad */}
        <Section
          icon={Wifi}
          title="Comodidad"
          description="Opciones para que la tienda se adapte a ti"
        >
          <div className="divide-y divide-border/50">
            <Row
              title="Modo ahorro de datos"
              description="Imágenes más livianas y sin animaciones pesadas. Ideal si navegas con datos móviles."
              control={<Switch checked={dataSaver} onCheckedChange={setDataSaver} aria-label="Modo ahorro de datos" />}
            />
            <div className="py-3">
              <p className="font-semibold text-sm mb-1">Moneda preferida</p>
              <p className="text-xs text-muted-foreground mb-3">
                Así se muestran los precios y se calcula tu carrito.
              </p>
              <div className="flex bg-white dark:bg-slate-950 p-1.5 rounded-2xl border border-border/50 shadow-inner max-w-xs">
                {(["USD", "CUP"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => changeCurrency(c)}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
                      currency === c
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c === "USD" ? "USD ($)" : "CUP ($)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Perfil */}
        <Section
          icon={User}
          title="Mi perfil"
          description="Estos datos se usan para tus pedidos y entregas"
        >
          {!user ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Inicia sesión para guardar tu perfil y que tus pedidos lleguen con tus datos.
              </p>
              <Button asChild className="rounded-2xl">
                <Link to="/auth">Iniciar sesión</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="set-name">Nombre</Label>
                <Input
                  id="set-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="set-phone">
                  Teléfono <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground font-normal ml-1">(obligatorio)</span>
                </Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="set-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: 5842 7265"
                    inputMode="tel"
                    className="rounded-2xl pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="set-address">Dirección de entrega</Label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="set-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, número, entre calles, municipio"
                    className="rounded-2xl pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Se guarda en este dispositivo y agiliza tus pedidos a domicilio.
                </p>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="rounded-2xl w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Guardando..." : "Guardar perfil"}
              </Button>
            </div>
          )}
        </Section>

        {/* Notificaciones */}
        <Section
          icon={Bell}
          title="Notificaciones"
          description="Elige qué avisos quieres recibir"
        >
          <div className="divide-y divide-border/50">
            <Row
              title="Avisos del blog"
              description="Te avisamos cuando publiquemos un artículo nuevo."
              control={
                <Switch
                  checked={blogNotif}
                  onCheckedChange={toggleBlogNotif}
                  aria-label="Avisos del blog"
                />
              }
            />
            <Row
              title="Alertas de stock por WhatsApp"
              description="Te escribimos cuando un producto agotado vuelve a estar disponible."
              control={
                <Switch
                  checked={stockNotif}
                  onCheckedChange={toggleStockNotif}
                  aria-label="Alertas de stock"
                />
              }
            />
          </div>
        </Section>

        {/* Cuenta */}
        <Section icon={LogOut} title="Cuenta" description="Accesos rápidos y datos locales">
          <div className="space-y-2">
            <Link
              to="/cuenta"
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/60 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <User className="w-4 h-4 text-muted-foreground" /> Mi cuenta
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/favoritos"
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/60 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Heart className="w-4 h-4 text-muted-foreground" /> Mis favoritos
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <button
              type="button"
              onClick={clearLocalData}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-destructive/10 transition-colors text-left"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-destructive">
                <Trash2 className="w-4 h-4" /> Borrar datos locales
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            {user && (
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/60 transition-colors text-left"
              >
                <span className="flex items-center gap-3 text-sm font-semibold">
                  <LogOut className="w-4 h-4 text-muted-foreground" /> Cerrar sesión
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </Section>

        <p className="text-center text-xs text-muted-foreground pb-4">
          NeoCharge · La Habana, Cuba
        </p>
      </div>
    </div>
  );
}

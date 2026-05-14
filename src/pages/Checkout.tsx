import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, MapPin, Store, Truck, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatCUP } from "@/lib/format";
import { buildWhatsAppMessage, getWhatsAppLink } from "@/lib/whatsapp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Loc {
  id: string;
  name: string;
  address: string;
  location_type: string;
  hours: string | null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart, paymentCurrency, totalUSD, totalCUP } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("delivery");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_usd");

  const [locations, setLocations] = useState<Loc[]>([]);
  const [pickupLocId, setPickupLocId] = useState<string>("");

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Finalizar pedido — NeoCharge";
  }, []);

  useEffect(() => {
    setGeoLoading(true);
    setGeoError(null);
    supabase
      .from("store_locations")
      .select("id,name,address,location_type,hours")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading locations:", error);
          setGeoError("No pudimos cargar los locales. Intenta de nuevo.");
          setGeoLoading(false);
          return;
        }
        if (data) {
          setLocations(data);
          if (data.length > 0) setPickupLocId(data[0].id);
        }
        setGeoLoading(false);
      })
      .catch((err) => {
        console.error("Checkout locations error:", err);
        setGeoError("Error conectando con el servidor.");
        setGeoLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name,phone,username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.full_name) setName(data.full_name);
          else if (data.username) setName(data.username);
          if (data.phone) setPhone(data.phone);
        }
      });
  }, [user]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta ubicación");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast.success("Ubicación capturada correctamente");
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Permiso denegado. Activa la ubicación en tu navegador y vuelve a intentar.");
        } else {
          setGeoError("No pudimos obtener tu ubicación. Intenta de nuevo.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold">Tu carrito está vacío</h1>
        <p className="text-muted-foreground">Añade productos antes de continuar.</p>
        <Button asChild variant="hero">
          <Link to="/tienda">Ir a la tienda</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Por favor completa nombre y teléfono");
      return;
    }
    if (delivery === "delivery" && !address.trim()) {
      toast.error("Indica la dirección de entrega");
      return;
    }
    if (delivery === "pickup" && !pickupLocId) {
      toast.error("Elige un local para recoger");
      return;
    }

    setSubmitting(true);

    const pickupLoc = locations.find((l) => l.id === pickupLocId);
    const mapLink = coords
      ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
      : null;

    try {
      const { error } = await supabase.from("orders").insert({
        user_id: user?.id ?? null,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_address: delivery === "delivery" ? address.trim() : null,
        delivery_method: delivery,
        pickup_location: delivery === "pickup" ? pickupLoc?.name ?? null : null,
        pickup_location_id: delivery === "pickup" ? pickupLocId : null,
        items: items as unknown,
        subtotal: total,
        delivery_fee: 0,
        total,
        admin_notes: notes.trim() || null,
        status: "pending",
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        location_link: mapLink,
        payment_method: paymentMethod,
        payment_currency: paymentCurrency,
      });
      if (error) {
        console.error("Order save error:", error);
        toast.error(error.message || "No se pudo guardar el pedido. Intenta de nuevo.");
        setSubmitting(false);
        return;
      }

      // Enviar mensaje de WhatsApp
      const waMessage = buildWhatsAppMessage({
        items,
        total,
        paymentCurrency,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        deliveryMethod: delivery,
        customerAddress: delivery === "delivery" ? address.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      window.open(getWhatsAppLink(waMessage), "_blank");

      toast.success("¡Pedido enviado! Te contactaremos pronto por WhatsApp para coordinar.");
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado al enviar el pedido");
      setSubmitting(false);
      return;
    }

    setTimeout(() => {
      clearCart();
      navigate("/");
    }, 1500);
  };

  return (
    <div className="container-page py-12 md:py-20">
      <div className="grid lg:grid-cols-[1fr_420px] gap-12">
        <form onSubmit={handleSubmit} className="space-y-10">
          <header className="space-y-4">
            <Link to="/tienda" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" /> Volver a la tienda
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
              Checkout Seguro
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight">Finalizar pedido</h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl">
              Recibimos tu pedido directamente. Te contactaremos por WhatsApp para coordinar el envío y el pago.
            </p>
          </header>

          <section className="card-elevated p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Tus datos</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp *</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+53 5XXXXXXX" />
              </div>
            </div>
          </section>

          <section className="card-elevated p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Método de entrega</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDelivery("delivery")}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all",
                  delivery === "delivery" ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/40",
                )}
              >
                <Truck className={cn("w-5 h-5 mb-2", delivery === "delivery" ? "text-primary" : "text-muted-foreground")} />
                <h3 className="font-semibold text-sm">Mensajería a domicilio</h3>
                <p className="text-xs text-muted-foreground mt-1">El precio se acuerda al confirmar</p>
              </button>
              <button
                type="button"
                onClick={() => setDelivery("pickup")}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all",
                  delivery === "pickup" ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/40",
                )}
              >
                <Store className={cn("w-5 h-5 mb-2", delivery === "pickup" ? "text-primary" : "text-muted-foreground")} />
                <h3 className="font-semibold text-sm">Recoger en local</h3>
                <p className="text-xs text-muted-foreground mt-1">{locations.length} locales disponibles</p>
              </button>
            </div>

            {delivery === "delivery" && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección exacta *</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="Calle, número, apto, municipio, referencias..."
                    className="min-h-[80px] rounded-xl"
                  />
                </div>

                <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Navigation className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">Comparte tu ubicación exacta (recomendado)</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Al darle clic, tu navegador te pedirá permiso para acceder a tu ubicación. Acepta para que el mensajero llegue más rápido y sin confusiones.
                      </p>
                    </div>
                  </div>
                  {coords ? (
                    <div className="flex items-center justify-between bg-success/10 text-success rounded-xl p-3 text-sm font-semibold">
                      <span>✓ Ubicación capturada</span>
                      <button type="button" onClick={requestLocation} className="text-xs underline">
                        Volver a capturar
                      </button>
                    </div>
                  ) : (
                    <Button type="button" onClick={requestLocation} variant="outline" className="w-full" disabled={geoLoading}>
                      {geoLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Obteniendo...</> : <><Navigation className="w-4 h-4" /> Compartir mi ubicación</>}
                    </Button>
                  )}
                  {geoError && <p className="text-xs text-destructive">{geoError}</p>}
                </div>
              </div>
            )}

            {delivery === "pickup" && locations.length > 0 && (
              <div className="space-y-2 animate-fade-in">
                <Label>Elige el local *</Label>
                <div className="grid gap-2">
                  {locations.map((loc) => (
                    <button
                      type="button"
                      key={loc.id}
                      onClick={() => setPickupLocId(loc.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        pickupLocId === loc.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{loc.name}</p>
                          <p className="text-xs text-muted-foreground">{loc.address}</p>
                          {loc.hours && <p className="text-xs text-muted-foreground mt-1">🕐 {loc.hours}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card-elevated p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Forma de pago preferida</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { v: "cash_usd", l: "Efectivo USD" },
                { v: "cash_cup", l: "Efectivo CUP" },
                { v: "transfer", l: "Transferencia bancaria" },
                { v: "mlc", l: "MLC" },
              ].map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPaymentMethod(p.v)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-sm font-medium transition-all",
                    paymentMethod === p.v ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30",
                  )}
                >
                  {p.l}
                </button>
              ))}
            </div>
          </section>

          <section className="card-elevated p-6 space-y-3">
            <Label htmlFor="notes" className="font-display text-lg font-bold">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Horario preferido, indicaciones especiales..."
              className="min-h-[70px] rounded-xl"
            />
          </section>

          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : <><MessageCircle className="w-5 h-5" /> Confirmar pedido</>}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Te contactaremos por WhatsApp lo antes posible para confirmar disponibilidad, precio del envío y coordinar el pago.
          </p>
        </form>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-elevated p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Resumen del pedido</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                    {it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{it.name}</p>
                    <p className="text-xs text-muted-foreground">Cant: {it.quantity}</p>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap">
                    {paymentCurrency === "USD" 
                      ? formatPrice((it.displayPriceUSD || 0) * it.quantity) 
                      : formatCUP((it.displayPriceCUP || 0) * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{paymentCurrency === "USD" ? formatPrice(totalUSD) : formatCUP(totalCUP)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Envío</span>
                <span className="text-xs italic">Calculado al confirmar</span>
              </div>
              <div className="flex items-center justify-between font-display font-bold text-base pt-2 border-t border-border">
                <span>Total a pagar</span>
                <div className="text-right">
                  <span className="text-primary text-2xl block">
                    {paymentCurrency === "USD" ? formatPrice(totalUSD) : formatCUP(totalCUP)}
                  </span>
                  {paymentCurrency === "USD" ? (
                    <span className="text-[10px] text-muted-foreground block">≈ {formatCUP(totalCUP)}</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground block">≈ {formatPrice(totalUSD)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;

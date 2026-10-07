import { useEffect, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, MapPin, Store, Truck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useDeliveryQuote } from "@/hooks/use-delivery-quote";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatCUP, formatPrice } from "@/lib/format";
import { buildWhatsAppMessage, getWhatsAppLink } from "@/lib/whatsapp";
import { buildOrderBreakdown } from "@/lib/order-pricing";
import { normalizeCubanPhone } from "@/lib/cuban-phone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// Los mapas (maplibre-gl ~1MB) se cargan solo cuando el usuario los abre,
// para no inflar el chunk inicial del checkout.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DeliveryRouteMap = lazy(() => import("@/components/DeliveryRouteMap").then((m: any) => ({ default: m.DeliveryRouteMap })));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LocationPickerMap = lazy(() => import("@/components/LocationPickerMap").then((m: any) => ({ default: m.LocationPickerMap })));

function MapFallback() {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/40 h-64 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando mapa…
    </div>
  );
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart, paymentCurrency, setPaymentCurrency, totalUSD, totalCUP, completeUSD, completeCUP, removeItem, updateQuantity } = useCart();
  // Sin tasa no se inventan conversiones: un total incompleto se muestra como "—".
  const shownTotalUSD = completeUSD ? formatPrice(totalUSD) : "—";
  const shownTotalCUP = completeCUP ? formatCUP(totalCUP) : "—";
  const { user } = useAuth();
  const { rate } = useExchangeRate();
  const { settings } = useSiteSettings();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("delivery");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  // El costo de envío YA NO se escribe a mano: se cotiza automáticamente por km
  // con la ubicación GPS del cliente (misma tarifa que /calcular-envio).
  const { configError, quote, quotedCoords, quoting, quoteError, quoteFor, clearQuote, origin } = useDeliveryQuote();
  const shippingCUP = delivery === "delivery" ? quote?.priceCUP ?? 0 : 0;
  const shippingUSD = 0;

  // NOTA M11/H5 (2026-10-07): "Recoger en local" es GENÉRICO a propósito.
  // Los locales de socios (p. ej. Yusi – Playa / Boyeros) viven en
  // partner_location_directory, que solo tiene GRANT SELECT a `authenticated`
  // y RLS de admin/owner en las tablas base: un visitante anónimo NO puede
  // leerlos, y exponerlos al público filtraría identidades, teléfonos y
  // costos de socios. No hay vista ni RPC pública con ese dato (ver
  // supabase/migrations/20261006190000_partner_fulfillment.sql), así que
  // el cliente elige recogida genérica y el local exacto se coordina por
  // WhatsApp con Mel, como ya hace el bot.

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // Geocodificación de la dirección escrita (Nominatim) para cotizar sin GPS.
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  // Mapa para elegir la ubicación tocando (tercera vía para cotizar).
  const [showPicker, setShowPicker] = useState(false);

  // La cotización solo es válida si corresponde a las coordenadas actuales.
  const quoteValid =
    delivery !== "delivery" ||
    (quote !== null &&
      quotedCoords !== null &&
      coords !== null &&
      quotedCoords.lat === coords.lat &&
      quotedCoords.lng === coords.lng);

  useEffect(() => {
    document.title = "Finalizar pedido — NeoCharge";
  }, []);

  // Cotizar el envío automáticamente cuando hay ubicación GPS (solo mensajería).
  useEffect(() => {
    if (delivery === "delivery" && coords) {
      void quoteFor(coords.lat, coords.lng);
    } else {
      clearQuote();
    }
  }, [delivery, coords, quoteFor, clearQuote]);

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

  // Geocodifica la dirección escrita con Nominatim (OpenStreetMap) y cotiza
  // el envío con esas coordenadas, sin necesidad de GPS.
  const geocodeAddress = async () => {
    if (!address.trim()) {
      setGeocodeError("Escribe tu dirección primero.");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const q = encodeURIComponent(`${address.trim()}, La Habana, Cuba`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cu&q=${q}`,
        { headers: { Accept: "application/json" } },
      );
      const data: unknown = await res.json();
      const first = Array.isArray(data) ? (data[0] as { lat?: string; lon?: string } | undefined) : undefined;
      const lat = Number(first?.lat);
      const lng = Number(first?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        // El efecto de abajo cotiza automáticamente al cambiar coords.
        setCoords({ lat, lng });
        toast.success("Dirección localizada, calculando envío…");
      } else {
        setGeocodeError("No encontramos esa dirección. Revisa el texto o usa tu ubicación GPS.");
      }
    } catch {
      setGeocodeError("No pudimos buscar la dirección. Inténtalo de nuevo.");
    } finally {
      setGeocoding(false);
    }
  };

  // Reintenta la cotización con las coordenadas actuales.
  const retryQuote = () => {
    if (coords) void quoteFor(coords.lat, coords.lng);
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
    // M9/H3: validar el móvil cubano igual que StockAlertSignup — normalizeCubanPhone
    // devuelve null si no es 53 + 8 dígitos (móvil), y ese es el formato que se guarda.
    const normalizedPhone = normalizeCubanPhone(phone);
    if (!name.trim() || !normalizedPhone) {
      toast.error("Revisa tus datos: nombre completo y móvil cubano de 8 dígitos (ej: 5842 7265).");
      return;
    }
    if (delivery === "delivery" && !address.trim()) {
      toast.error("Indica la dirección de entrega");
      return;
    }
    // Mensajería: exigir cotización válida. Sin ella no se puede enviar el pedido,
    // para no registrar un envío con costo cero o inventado.
    if (delivery === "delivery") {
      if (quoting) {
        toast.error("Espera a que calculemos el costo del envío…");
        return;
      }
      if (!coords) {
        toast.error("Comparte tu ubicación para calcular el costo del envío");
        return;
      }
      if (!quoteValid) {
        toast.error(quoteError ?? "No pudimos calcular el envío. Inténtalo de nuevo.");
        return;
      }
    }
    // M11: la recogida es genérica (sin local específico); el local exacto se
    // coordina por WhatsApp (ver nota arriba). No hay validación de local.

    setSubmitting(true);

    try {
      // M10/H4/H11: revalidar el stock en vivo antes de insertar el pedido.
      // El carrito vive en localStorage y el stock pudo cambiar entre que el
      // cliente añadió los productos y confirma. null = sin control de stock.
      const itemIds = items.map((it) => it.id).filter(Boolean) as string[];
      if (itemIds.length > 0) {
        const { data: liveStocks, error: stockError } = await supabase
          .from("products")
          .select("id,stock")
          .in("id", itemIds);
        if (stockError) {
          console.error("Stock revalidation error:", stockError);
          toast.error("No pudimos verificar el stock. Intenta de nuevo.");
          return;
        }
        const liveMap = new Map((liveStocks ?? []).map((p) => [p.id, p.stock as number | null]));
        const agotados: string[] = [];
        const ajustados: string[] = [];
        for (const it of items) {
          if (!liveMap.has(it.id)) continue;
          const live = liveMap.get(it.id);
          if (live == null) continue; // sin control de stock
          if (live <= 0) {
            agotados.push(it.name);
            removeItem(it.id);
          } else if (it.quantity > live) {
            ajustados.push(`${it.name} (quedan ${live})`);
            updateQuantity(it.id, live);
          }
        }
        if (agotados.length > 0) {
          toast.error(`Ya no hay stock de: ${agotados.join(", ")}. Los quitamos del carrito.`);
          return;
        }
        if (ajustados.length > 0) {
          toast.warning(
            `Ajustamos cantidades según el stock disponible: ${ajustados.join(", ")}. Revisa el pedido y confirma de nuevo.`,
          );
          return;
        }
      }

      const mapLink = coords
        ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
        : null;

      const breakdown = buildOrderBreakdown({
        subtotal: completeUSD ? totalUSD : null,
        subtotalCUP: completeCUP ? totalCUP : null,
        shippingUSD,
        shippingCUP,
      });

      const orderPayload = {
        user_id: user?.id ?? null,
        customer_name: name.trim(),
        customer_phone: normalizedPhone,
        customer_address: delivery === "delivery" ? address.trim() : null,
        delivery_method: delivery,
        pickup_location: delivery === "pickup" ? "Recoger en local (coordinar por WhatsApp)" : null,
        pickup_location_id: null,
        items: items as unknown,
        subtotal: breakdown.productUSD ?? 0,
        delivery_fee: breakdown.shippingUSD,
        total: breakdown.totalUSD ?? 0,
        total_cup: breakdown.totalCUP,
        exchange_rate: rate ?? null,
        admin_notes: notes.trim() || null,
        status: "pending",
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        location_link: mapLink,
        payment_method: paymentCurrency === "USD" ? "cash_usd" : "cash_cup",
        payment_currency: paymentCurrency,
      };

      const { error } = await supabase.from("orders").insert(orderPayload);
      if (error) {
        console.error("Order save error:", error);
        toast.error(error.message || "No se pudo guardar el pedido. Intenta de nuevo.");
        return;
      }

      const waMessage = buildWhatsAppMessage({
        items,
        total,
        paymentCurrency,
        customerName: name.trim(),
        customerPhone: normalizedPhone,
        deliveryMethod: delivery,
        customerAddress: delivery === "delivery" ? address.trim() : undefined,
        notes: notes.trim() || undefined,
        shippingUSD,
        shippingCUP,
        subtotalUSD: completeUSD ? totalUSD : null,
        subtotalCUP: completeCUP ? totalCUP : null,
      });

      try {
        window.open(getWhatsAppLink(waMessage), "_blank");
      } catch (openError) {
        console.error("WhatsApp open error:", openError);
        toast.error("Pedido guardado, pero no pudimos abrir WhatsApp automáticamente.");
      }

      toast.success("¡Pedido enviado! Te contactaremos pronto por WhatsApp para coordinar el pago.");
      setTimeout(() => {
        clearCart();
        navigate("/");
      }, 1500);
    } catch (submitError) {
      console.error("Checkout submit error:", submitError);
      toast.error("Error inesperado al enviar el pedido. Por favor intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="font-display text-5xl font-bold tracking-tight nc-title-gradient">Finalizar pedido</h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl">
              Recibimos tu pedido directamente. Te contactaremos por WhatsApp para coordinar el envío y el pago.
            </p>
          </header>

          <section className="nc-card p-6 space-y-4 hover-lift">
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

          <section className="nc-card p-6 space-y-4 hover-lift">
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
                <p className="text-xs text-muted-foreground mt-1">Se calcula automático con tu ubicación</p>
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
                <p className="text-xs text-muted-foreground mt-1">Coordinamos el local por WhatsApp</p>
              </button>
            </div>

            {delivery === "delivery" && (
              <div className="space-y-4 animate-fade-in">
                {/* Panel inline: todo el cálculo de envío en un solo lugar */}
                <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/[0.07] to-transparent p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-base font-bold">Calcula tu envío</h3>
                  </div>

                  {/* 1. Ubicación GPS */}
                  {coords ? (
                    <div className="flex items-center justify-between bg-success/10 text-success rounded-xl p-3 text-sm font-semibold">
                      <span>✓ Ubicación capturada</span>
                      <button type="button" onClick={requestLocation} className="text-xs underline underline-offset-2">
                        Volver a capturar
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={requestLocation}
                      variant="hero"
                      size="lg"
                      className="w-full text-base"
                      disabled={geoLoading}
                    >
                      {geoLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Obteniendo ubicación…
                        </>
                      ) : (
                        <>📍 Compartir mi ubicación</>
                      )}
                    </Button>
                  )}
                  {geoError && (
                    <div className="flex items-start justify-between gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-xs">
                      <span>{geoError}</span>
                      <button type="button" onClick={requestLocation} className="font-bold underline underline-offset-2 shrink-0">
                        Reintentar
                      </button>
                    </div>
                  )}

                  {/* 2. Dirección escrita */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <span>o escribe tu dirección</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección exacta *</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      placeholder="Calle, número, apto, municipio, referencias..."
                      className="min-h-[80px] rounded-xl bg-background"
                    />
                    <Button
                      type="button"
                      onClick={geocodeAddress}
                      variant="outline"
                      className="w-full"
                      disabled={geocoding || quoting || !address.trim()}
                    >
                      {geocoding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Buscando dirección…
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" /> Calcular envío con esta dirección
                        </>
                      )}
                    </Button>
                    {geocodeError && (
                      <div className="flex items-start justify-between gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-xs">
                        <span>{geocodeError}</span>
                        <button type="button" onClick={geocodeAddress} className="font-bold underline underline-offset-2 shrink-0">
                          Reintentar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. Elegir en el mapa */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <span>o elige en el mapa</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  {!showPicker ? (
                    <Button
                      type="button"
                      onClick={() => setShowPicker(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <MapPin className="w-4 h-4" /> Elegir mi ubicación en el mapa
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Suspense fallback={<MapFallback />}>
                      <LocationPickerMap
                        center={origin ?? { lat: 23.1367, lng: -82.3589 }}
                        initialPoint={coords}
                        onPick={(lat, lng) => {
                          setCoords({ lat, lng });
                          setShowPicker(false);
                        }}
                      />
                      </Suspense>
                      <button
                        type="button"
                        onClick={() => setShowPicker(false)}
                        className="text-xs text-muted-foreground underline underline-offset-2"
                      >
                        Cerrar mapa
                      </button>
                    </div>
                  )}

                  {/* 4. Resultado de la cotización */}
                  {quoting && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Calculando envío…
                    </p>
                  )}
                  {!quoting && quote && quoteValid && (
                    <>
                      <div className="rounded-xl bg-primary text-primary-foreground p-4 flex items-center justify-between gap-2 shadow-soft">
                        <span className="text-sm font-semibold">
                          Mensajería ({quote.km.toFixed(1)} km × {formatCUP(quote.pricePerKm)}/km)
                        </span>
                        <span className="font-display text-xl font-bold whitespace-nowrap">= {formatCUP(quote.priceCUP)}</span>
                      </div>
                      {quotedCoords && (
                        <Suspense fallback={<MapFallback />}>
                          <DeliveryRouteMap origin={origin} dest={quotedCoords} />
                        </Suspense>
                      )}
                    </>
                  )}
                  {!quoting && quoteError && (
                    <div className="flex items-start justify-between gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-xs">
                      <span>{quoteError}</span>
                      <button type="button" onClick={retryQuote} className="font-bold underline underline-offset-2 shrink-0">
                        Reintentar
                      </button>
                    </div>
                  )}
                  {configError && <p className="text-xs text-amber-600">{configError}</p>}
                </div>
              </div>
            )}

            {delivery === "pickup" && (
              <div className="space-y-2 animate-fade-in">
                {settings?.locations_intro && (
                  <p className="text-sm text-muted-foreground">{settings.locations_intro}</p>
                )}
                <div className="rounded-2xl bg-brand-100/70 border border-brand-300/60 p-4 text-sm text-brand-900">
                  <p className="font-semibold mb-1">🏪 Recoger en local</p>
                  <p>
                    Al confirmar, te contactaremos por WhatsApp para coordinar el local
                    de recogida con tu producto disponible.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="nc-card p-6 space-y-3 hover-lift">
            <Label htmlFor="notes" className="font-display text-lg font-bold">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Horario preferido, indicaciones especiales..."
              className="min-h-[70px] rounded-xl"
            />
          </section>

          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={submitting || (delivery === "delivery" && (quoting || !quoteValid))}>
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : <><MessageCircle className="w-5 h-5" /> Confirmar pedido</>}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Te contactaremos por WhatsApp lo antes posible para confirmar disponibilidad, precio del envío y coordinar el pago.
          </p>
        </form>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="nc-card p-6 space-y-4 hover-lift">
            <h2 className="font-display text-lg font-bold">Resumen del pedido</h2>

            <div className="flex items-center justify-between bg-white/70 backdrop-blur p-1.5 rounded-2xl border border-slate-200/70 shadow-inner">
              <button
                type="button"
                onClick={() => setPaymentCurrency("USD")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                  paymentCurrency === "USD" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pagar en USD
              </button>
              <button
                type="button"
                onClick={() => setPaymentCurrency("CUP")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                  paymentCurrency === "CUP" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pagar en CUP
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                    {it.image && <img src={it.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{it.name}</p>
                    <p className="text-xs text-muted-foreground">Cant: {it.quantity}</p>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap">
                    {(() => {
                      const usd = it.displayPriceUSD != null ? formatPrice(it.displayPriceUSD * it.quantity) : null;
                      const cup = it.displayPriceCUP != null ? formatCUP(it.displayPriceCUP * it.quantity) : null;
                      if (paymentCurrency === "USD") return usd ?? cup ?? "—";
                      return cup ?? usd ?? "—";
                    })()}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Producto</span>
                <span>{shownTotalUSD} / {shownTotalCUP}</span>
              </div>
              <div className="space-y-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Envío</span>
                  <span>{delivery === "pickup" ? "Gratis en local" : "Automático por km"}</span>
                </div>
                {delivery === "pickup" ? (
                  <p className="text-sm text-muted-foreground">Recoges gratis en el local elegido.</p>
                ) : quoting ? (
                  <p className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculando envío…
                  </p>
                ) : quote ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      Mensajería ({quote.km.toFixed(1)} km × {formatCUP(quote.pricePerKm)}/km)
                    </span>
                    <span className="font-bold whitespace-nowrap">{formatCUP(quote.priceCUP)}</span>
                  </div>
                ) : (
                  <div className="text-sm space-y-2">
                    <p className="text-muted-foreground">
                      Calcula tu envío en el panel de mensajería de arriba y aquí verás el costo.
                    </p>
                    <Link to="/calcular-envio" className="text-primary underline text-xs font-semibold">
                      O calcúlalo aquí con tu ubicación →
                    </Link>
                    {quoteError && <p className="text-xs text-destructive">{quoteError}</p>}
                    {configError && <p className="text-xs text-amber-600">{configError}</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between font-display font-bold text-base pt-2 border-t border-border">
                <span>Total a pagar</span>
                <div className="text-right">
                  <span className="text-primary text-base block">
                    {completeUSD ? formatMoney(totalUSD + shippingUSD, "USD") : "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {completeCUP ? formatMoney(totalCUP + shippingCUP, "CUP") : "—"}
                  </span>
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
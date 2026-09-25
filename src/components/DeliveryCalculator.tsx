import { useState, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  MapPin,
  Navigation,
  X,
  Plus,
  Calculator,
  Info,
  LocateFixed,
  Link2,
  Search,
  Store,
  Loader2,
} from "lucide-react";
import { formatCUP } from "@/lib/format";
import { parseLocationInput } from "@/lib/location-links";
import { DeliveryOrderForm } from "@/components/DeliveryOrderForm";

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// El número de WhatsApp del pedido ahora lo maneja DeliveryOrderForm
// (constante hardcodeada 5363180910, el único número permitido).

const DEFAULT_ORIGIN = { lat: 23.13474182, lng: -82.39116033, label: "Local Vedado" };
const DEFAULT_PRICE_PER_KM = 250;

interface SalePoint {
  id: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

function dotIcon(color: string, emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:15px;">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Controlador para centrar suavemente el mapa cuando se marca un punto
function MapController({ center }: { center?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function DeliveryCalculator() {
  const [pricePerKm, setPricePerKm] = useState(DEFAULT_PRICE_PER_KM);
  const [salePoints, setSalePoints] = useState<SalePoint[]>([]);
  const [origin, setOrigin] = useState<LatLng & { label: string } | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [stop, setStop] = useState<LatLng | null>(null);
  const [addingStop, setAddingStop] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [linkInput, setLinkInput] = useState("");
  const [resolvingLink, setResolvingLink] = useState(false);

  const [mapFocus, setMapFocus] = useState<[number, number] | null>(null);

  // Cargar tarifa, locales y local origen desde Supabase (cliente público)
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: cfg }, { data: points }] = await Promise.all([
          supabase
            .from("site_settings")
            .select("value")
            .eq("key", "delivery_config")
            .maybeSingle(),
          supabase.from("sale_points").select("*").eq("is_active", true),
        ]);

        const price = Number((cfg?.value as any)?.price_per_km);
        if (Number.isFinite(price) && price > 0) setPricePerKm(price);

        const pts: SalePoint[] = (points ?? [])
          .map((p: any) => ({
            id: String(p.id),
            name: p.name,
            address: p.address ?? null,
            lat: Number(p.lat),
            lng: Number(p.lng),
          }))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        setSalePoints(pts);

        const originId = (cfg?.value as any)?.origin_sale_point_id as
          | string
          | undefined;
        const pick =
          pts.find((p) => p.id === originId) ??
          pts.find((p) => /vedado/i.test(p.name)) ??
          pts[0];
        if (pick) {
          setOrigin({ lat: pick.lat, lng: pick.lng, label: pick.name });
          setMapFocus([pick.lat, pick.lng]);
        } else {
          setOrigin(DEFAULT_ORIGIN);
          setMapFocus([DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lng]);
        }
      } catch {
        setOrigin(DEFAULT_ORIGIN);
      }
    };
    load();
  }, []);

  const calculateRoute = useCallback(async () => {
    if (!origin || !dest) {
      setRoute([]);
      setDistanceKm(0);
      return;
    }
    setLoadingRoute(true);
    try {
      const pts = [`${origin.lng},${origin.lat}`];
      if (stop) pts.push(`${stop.lng},${stop.lat}`);
      pts.push(`${dest.lng},${dest.lat}`);
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pts.join(";")}?overview=full&geometries=geojson`,
      );
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.[0]) {
        setRoute(
          data.routes[0].geometry.coordinates.map(
            (c: number[]) => [c[1], c[0]] as [number, number],
          ),
        );
        setDistanceKm(data.routes[0].distance / 1000);
      } else {
        toast.error("No se pudo calcular la ruta por carretera.");
        setRoute([]);
        setDistanceKm(0);
      }
    } catch {
      toast.error("Error al conectar con el servicio de mapas.");
      setRoute([]);
      setDistanceKm(0);
    } finally {
      setLoadingRoute(false);
    }
  }, [origin, dest, stop]);

  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  const handleMapClick = (lat: number, lng: number) => {
    if (addingStop) {
      setStop({ lat, lng });
      setAddingStop(false);
      toast.success("Parada intermedia añadida.");
    } else {
      setDest({ lat, lng });
      setMapFocus([lat, lng]);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=cu&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } },
      );
      const data = (await res.json()) as NominatimResult[];
      setSearchResults(Array.isArray(data) ? data : []);
      if (!data?.length)
        toast.info("Sin resultados. Prueba con otra dirección o toca el mapa.");
    } catch {
      toast.error("No se pudo buscar la dirección.");
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (r: NominatimResult) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("Resultado inválido.");
      return;
    }
    setDest({ lat, lng });
    setMapFocus([lat, lng]);
    setSearchResults([]);
    setSearchQuery(r.display_name.split(",").slice(0, 2).join(","));
    toast.success("Destino marcado en el mapa.");
  };

  const handleGps = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización.");
      return;
    }
    toast.info("Obteniendo tu ubicación...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDest({ lat: latitude, lng: longitude });
        setMapFocus([latitude, longitude]);
        toast.success("Tu ubicación está marcada en el mapa.");
      },
      (err) => toast.error("No se pudo obtener la ubicación: " + err.message),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const handleLinkSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = linkInput.trim();
    if (!raw) {
      toast.error("Pega las coordenadas o un enlace de ubicación.");
      return;
    }
    let parsed = parseLocationInput(raw);
    // Enlace corto (goo.gl / maps.app.goo.gl): resolver el destino final
    if (!parsed && /https?:\/\/(goo\.gl|maps\.app\.goo\.gl)/i.test(raw)) {
      setResolvingLink(true);
      try {
        const res = await fetch(
          `/api/resolve-link?url=${encodeURIComponent(raw)}`,
        );
        const data = await res.json();
        if (res.ok && data.finalUrl) parsed = parseLocationInput(data.finalUrl);
      } catch {
        // se maneja abajo con el toast de error
      } finally {
        setResolvingLink(false);
      }
    }
    if (parsed) {
      setDest({ lat: parsed.lat, lng: parsed.lng });
      setMapFocus([parsed.lat, parsed.lng]);
      toast.success("Ubicación detectada y marcada en el mapa.");
      setLinkInput("");
    } else {
      toast.error(
        "No pude leer esa ubicación. Revisa el enlace o las coordenadas.",
      );
    }
  };

  const clearAll = () => {
    setDest(null);
    setStop(null);
    setAddingStop(false);
    setRoute([]);
    setDistanceKm(0);
    setSearchResults([]);
    setSearchQuery("");
    setLinkInput("");
  };

  const price = Math.round(distanceKm * pricePerKm);

  const orderReady = distanceKm > 0 && !!dest;

  const otherPoints = salePoints.filter(
    (p) =>
      !origin ||
      !(
        Math.abs(p.lat - origin.lat) < 0.0001 &&
        Math.abs(p.lng - origin.lng) < 0.0001
      ),
  );

  return (
    <div className="grid gap-5 sm:gap-6 md:grid-cols-12 max-w-[1600px] mx-auto w-full min-w-0">
      {/* Panel lateral: controles */}
      <div className="md:col-span-5 xl:col-span-4 space-y-5 sm:space-y-6 min-w-0 max-w-full">
        <Card className="p-6 rounded-3xl shadow-soft border-border/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Calculadora de envío</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Mensajería NeoCharge
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs bg-secondary/40 p-3 rounded-xl border border-border/50">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                Tarifa: <strong>{formatCUP(pricePerKm)}/km</strong>. Los envíos se
                calculan desde <strong>{origin?.label ?? "el local del Vedado"}</strong>,
                por carretera como si fuera en carro.
              </span>
            </div>

            {/* Buscador de direcciones */}
            <form onSubmit={handleSearch} className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Search className="w-3 h-3" /> Buscar dirección
              </Label>
              <div className="flex gap-2 min-w-0">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej: Calle 23 y M, Vedado"
                  aria-label="Buscar dirección"
                  className="rounded-xl h-11 min-w-0 flex-1"
                />
                <Button
                  type="submit"
                  disabled={searching}
                  className="rounded-xl shrink-0 min-h-[44px] px-4"
                  aria-label="Buscar dirección"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar pr-0.5">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectSearchResult(r)}
                      className="w-full text-left text-xs p-3 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/60 hover:border-primary/30 active:scale-[0.99] transition-all min-h-[44px]"
                    >
                      <MapPin className="w-3 h-3 inline mr-1.5 text-primary" />
                      {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* GPS + parada */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleGps}
                className="rounded-xl min-h-[44px] min-w-0 w-full px-2 text-xs sm:text-sm"
              >
                <LocateFixed className="w-4 h-4 mr-1 shrink-0" /> <span className="truncate">Mi ubicación</span>
              </Button>
              {stop ? (
                <Button
                  variant="outline"
                  onClick={() => setStop(null)}
                  className="rounded-xl min-h-[44px] min-w-0 w-full px-2 text-xs sm:text-sm"
                >
                  <X className="w-4 h-4 mr-1 shrink-0" /> <span className="truncate">Quitar parada</span>
                </Button>
              ) : (
                <Button
                  variant={addingStop ? "default" : "outline"}
                  onClick={() => setAddingStop((v) => !v)}
                  className="rounded-xl min-h-[44px] min-w-0 w-full px-2 text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4 mr-1 shrink-0" />
                  <span className="truncate">{addingStop ? "Toca el mapa…" : "Agregar parada"}</span>
                </Button>
              )}
            </div>

            {/* Pegar coordenadas o enlace */}
            <form onSubmit={handleLinkSubmit} className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Link2 className="w-3 h-3" /> Pegar coordenadas o enlace
              </Label>
              <div className="flex gap-2 min-w-0">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="23.13, -82.39 o enlace de Maps / MAPS.ME / WhatsApp"
                  aria-label="Pegar coordenadas o enlace"
                  className="rounded-xl h-11 min-w-0 flex-1"
                />
                <Button
                  type="submit"
                  disabled={resolvingLink}
                  className="rounded-xl shrink-0 min-h-[44px] px-4"
                >
                  {resolvingLink ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Ubicar"
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Acepta coordenadas, enlaces de Google Maps, MAPS.ME, Apple Maps y los
                que se comparten por WhatsApp.
              </p>
            </form>

            <p className="text-[10px] text-muted-foreground text-center border-2 border-dashed border-border rounded-2xl py-3">
              O simplemente <strong>toca el mapa</strong> para marcar tu destino.
            </p>
          </div>
        </Card>

        {/* Resultado */}
        {orderReady && (
          <Card className="p-6 rounded-3xl shadow-soft bg-primary text-white overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Navigation className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-4 min-w-0">
              <div className="grid grid-cols-2 gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold opacity-80">Distancia</p>
                  <p className="text-2xl sm:text-3xl font-display font-bold tabular-nums leading-tight break-words">
                    {loadingRoute ? "…" : `${distanceKm.toFixed(1)} km`}
                  </p>
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[10px] uppercase font-bold opacity-80">Costo del envío</p>
                  <p className="text-2xl sm:text-3xl font-display font-bold tabular-nums leading-tight break-words">{formatCUP(price)}</p>
                </div>
              </div>
              {stop && (
                <p className="text-[11px] bg-white/20 p-2 rounded-xl border border-white/20">
                  🛑 Incluye una parada intermedia en la ruta.
                </p>
              )}
              <p className="text-[11px] opacity-80 text-center">
                Completa el formulario de abajo para hacer tu pedido por WhatsApp.
              </p>
              <button
                onClick={clearAll}
                className="w-full text-[11px] uppercase font-bold opacity-80 hover:opacity-100"
              >
                Limpiar
              </button>
            </div>
          </Card>
        )}

        {/* Locales */}
        <Card className="p-6 rounded-3xl border-border/50 shadow-soft">
          <h3 className="font-display text-base font-bold flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-primary" /> Nuestros locales
          </h3>
          <div className="space-y-2">
            {origin && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-primary/5 border border-primary/20 transition-colors hover:bg-primary/10">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold">{origin.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Origen de todos los envíos
                  </p>
                </div>
              </div>
            )}
            {otherPoints.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-secondary/30 border border-border/50 transition-colors hover:bg-secondary/50"
              >
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{p.name}</p>
                  {p.address && (
                    <p className="text-[10px] text-muted-foreground">{p.address}</p>
                  )}
                </div>
              </div>
            ))}
            {salePoints.length === 0 && !origin && (
              <p className="text-[10px] text-muted-foreground italic">
                Cargando locales…
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Mapa */}
      <div className="md:col-span-7 xl:col-span-8 h-[420px] sm:h-[500px] md:h-auto md:min-h-[620px] relative min-w-0 max-w-full">
        <div className="absolute inset-0 rounded-3xl overflow-hidden border border-border/50 ring-1 ring-border/60 shadow-soft">
          <MapContainer
            center={[DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lng]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapFocus} />
            <MapClickHandler onMapClick={handleMapClick} />

            {origin && (
              <Marker position={[origin.lat, origin.lng]} icon={dotIcon("#16a34a", "🏠")}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{origin.label}</p>
                    <p className="text-muted-foreground">Origen de los envíos</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {otherPoints.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{p.name}</p>
                    {p.address && <p className="text-muted-foreground">{p.address}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {stop && (
              <Marker position={[stop.lat, stop.lng]} icon={dotIcon("#f59e0b", "🛑")}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">Parada intermedia</p>
                    <p className="text-muted-foreground">
                      {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {dest && (
              <Marker position={[dest.lat, dest.lng]} icon={dotIcon("#dc2626", "📍")}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">Destino</p>
                    <p className="text-muted-foreground">
                      {dest.lat.toFixed(5)}, {dest.lng.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {route.length > 0 && (
              <Polyline positions={route} color="#0066FF" weight={4} opacity={0.8} />
            )}
          </MapContainer>
        </div>
      </div>

      {/* Formulario de pedido completo: datos, dirección escrita, productos y totales */}
      {orderReady && (
        <div className="md:col-span-12 min-w-0 max-w-full">
          <DeliveryOrderForm
            distanceKm={distanceKm}
            pricePerKm={pricePerKm}
            originLabel={origin?.label ?? "Local Vedado"}
            dest={dest}
            stop={stop}
          />
        </div>
      )}
    </div>
  );
}

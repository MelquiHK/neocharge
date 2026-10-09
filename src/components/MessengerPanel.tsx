import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  MapPin,
  Navigation,
  Trash2,
  Calculator,
  DollarSign,
  Store,
  Info,
  LocateFixed,
  Crosshair,
  Share2,
  Check,
  ChevronDown,
  Bike,
  Plus,
} from "lucide-react";
import { formatCUP } from "@/lib/format";
import { safeErrorMessage } from "@/lib/error-message";

// Factor de corrección línea-recta -> carretera (mismo que use-delivery-quote)
const ROAD_FACTOR = 1.3;
const OSRM_TIMEOUT_MS = 8000;

// Distancia en línea recta (fórmula haversiana). Respaldo local cuando OSRM falla.
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Marcador numerado para las paradas
function numberedIcon(n: number): L.DivIcon {
  return L.divIcon({
    className: "nc-waypoint-marker",
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:linear-gradient(135deg,#9e5f8f,#6d4c6e);
      color:#fff;font-weight:800;font-size:13px;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);
    ">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

// Marcador del local (punto de venta)
function storeIcon(): L.DivIcon {
  return L.divIcon({
    className: "nc-store-marker",
    html: `<div style="
      width:32px;height:32px;border-radius:12px;
      background:#fff;color:#9e5f8f;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #9e5f8f;box-shadow:0 2px 8px rgba(0,0,0,.3);
      font-size:16px;
    ">🏪</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });
}

// Fix Leaflet marker icons (sin @ts-ignore: acceso tipado al prototipo)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

// Controlador para mover y centrar suavemente el mapa:
// - center: vuela a un punto (al añadir una parada)
// - bounds: encuadra todo el recorrido (al calcular la ruta)
function MapController({
  center,
  bounds,
}: {
  center?: [number, number] | null;
  bounds?: [number, number][] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.flyToBounds(L.latLngBounds(bounds.map(([lat, lng]) => [lat, lng] as [number, number])), {
        padding: [40, 40],
        duration: 1.2,
      });
    } else if (center) {
      map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 1.2 });
    }
  }, [center, bounds, map]);
  return null;
}

export function MessengerPanel() {
  const { user } = useAuth();
  const [rate, setRate] = useState(300);
  const [rateSaved, setRateSaved] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState(0); // in km
  const [approximate, setApproximate] = useState(false);
  const [loading, setLoading] = useState(false);
  interface SalePoint {
    id: string;
    name: string;
    address?: string | null;
    lat: number | string;
    lng: number | string;
  }
  const [salePoints, setSalePoints] = useState<SalePoint[]>([]);
  const [pointsLoading, setPointsLoading] = useState(true);

  // Estados para añadir coordenadas manualmente
  const [showCoordForm, setShowCoordForm] = useState(false);
  const [coordInput, setCoordInput] = useState("");
  const [coordLabel, setCoordLabel] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapBounds, setMapBounds] = useState<[number, number][] | null>(null);
  const rateDebounce = useRef<number | null>(null);

  // Fetch messenger rate and sale points
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [{ data: mProfile }, { data: points }] = await Promise.all([
        supabase.from("messenger_profiles").select("rate_per_km").eq("user_id", user.id).maybeSingle(),
        supabase.from("sale_points").select("*").eq("is_active", true)
      ]);

      if (mProfile) {
        setRate(Number(mProfile.rate_per_km));
        setRateSaved(true);
      }
      if (points) {
        setSalePoints(
          points.map((p) => ({
            id: String(p.id),
            name: String(p.name ?? ""),
            address: typeof p.address === "string" ? p.address : null,
            lat: Number(p.lat) || 0,
            lng: Number(p.lng) || 0,
          })),
        );
      }
      setPointsLoading(false);
    };
    load();
  }, [user]);

  // Guardar la tarifa en el perfil del mensajero (con debounce)
  const persistRate = useCallback(async (value: number) => {
    if (!user) return;
    if (!Number.isFinite(value) || value < 0) return;
    setSavingRate(true);
    try {
      const { error } = await supabase.from("messenger_profiles").upsert(
        { user_id: user.id, rate_per_km: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      setRateSaved(true);
    } catch (err) {
      toast.error("No se pudo guardar tu tarifa: " + safeErrorMessage(err));
      setRateSaved(false);
    } finally {
      setSavingRate(false);
    }
  }, [user]);

  const handleRateChange = (value: number) => {
    setRate(value);
    setRateSaved(false);
    setSavingRate(true); // honesto desde el primer instante: no recargar aún
    if (rateDebounce.current) window.clearTimeout(rateDebounce.current);
    rateDebounce.current = window.setTimeout(() => persistRate(value), 900);
  };

  // Guardar de inmediato al salir del campo (no esperar al debounce)
  const flushRate = () => {
    if (rateDebounce.current) {
      window.clearTimeout(rateDebounce.current);
      rateDebounce.current = null;
      void persistRate(rate);
    }
  };

  const calculateRoute = useCallback(async () => {
    if (waypoints.length < 2) return;
    setLoading(true);
    setApproximate(false);
    try {
      const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(";");
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), OSRM_TIMEOUT_MS);
      let ok = false;
      let routeCoords: [number, number][] | null = null;
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        if (data.code === "Ok") {
          routeCoords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          setRoute(routeCoords);
          setDistance(data.routes[0].distance / 1000); // meters to km
          ok = true;
        }
      } catch {
        ok = false; // timeout o error de red -> respaldo local
      } finally {
        window.clearTimeout(timer);
      }
      if (!ok) {
        // Respaldo local: suma de tramos en línea recta con factor de carretera
        let km = 0;
        for (let i = 1; i < waypoints.length; i++) {
          km += haversineKm(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng);
        }
        km *= ROAD_FACTOR;
        setDistance(km);
        setRoute([]);
        setApproximate(true);
        setMapBounds(waypoints.map(w => [w.lat, w.lng] as [number, number]));
        setMapCenter(null);
        toast.info("Mapa sin conexión: distancia aproximada (línea recta).");
      } else {
        setMapBounds(routeCoords ?? waypoints.map(w => [w.lat, w.lng] as [number, number]));
        setMapCenter(null);
      }
    } finally {
      setLoading(false);
    }
  }, [waypoints]);

  useEffect(() => {
    if (waypoints.length >= 2) {
      calculateRoute();
    } else {
      setRoute([]);
      setDistance(0);
      setApproximate(false);
    }
  }, [waypoints, calculateRoute]);

  const addWaypoint = (lat: number, lng: number, label: string = "Nueva parada") => {
    const newWp: Waypoint = {
      id: Math.random().toString(36).substr(2, 9),
      lat,
      lng,
      label
    };
    setWaypoints(prev => [...prev, newWp]);
    setMapBounds(null);
    setMapCenter([lat, lng]);
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(waypoints.filter(w => w.id !== id));
  };

  const addSalePoint = (point: { lat: number | string; lng: number | string; name: string }) => {
    addWaypoint(Number(point.lat), Number(point.lng), `Local: ${point.name}`);
  };

  const clearWaypoints = () => {
    setWaypoints([]);
    setRoute([]);
    setDistance(0);
    setApproximate(false);
    setMapBounds(null);
    setMapCenter(null);
  };

  // Función para procesar y agregar coordenadas ingresadas por el usuario
  const handleAddCustomCoordinates = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!coordInput.trim()) {
      toast.error("Por favor ingresa las coordenadas (Ej: 23.1259, -82.3791)");
      return;
    }

    // Admite formatos: "23.1259, -82.3791", "23.1259,-82.3791", "23.1259 -82.3791", "23.1259; -82.3791"
    const cleaned = coordInput.trim().replace(/[\t,;]+/g, " ");
    const parts = cleaned.split(/\s+/).filter(Boolean);

    if (parts.length < 2) {
      toast.error("Formato inválido. Usa formato: Latitud, Longitud (Ej: 23.1259, -82.3791)");
      return;
    }

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Las coordenadas deben ser números válidos.");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Coordenadas fuera de rango válido (-90 a 90 para latitud, -180 a 180 para longitud).");
      return;
    }

    const label = coordLabel.trim() || `Parada (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    addWaypoint(lat, lng, label);
    toast.success(`Coordenada marcada: ${label}`);
    setCoordInput("");
    setCoordLabel("");
  };

  // Obtener ubicación GPS actual
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización.");
      return;
    }

    toast.info("Obteniendo tu ubicación actual...");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        addWaypoint(latitude, longitude, "Mi ubicación actual");
        toast.success("Ubicación actual marcada en el mapa.");
      },
      err => {
        toast.error("No se pudo obtener la ubicación: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Compartir el resumen de la ruta por WhatsApp
  const handleShareRoute = async () => {
    if (waypoints.length < 2 || distance <= 0) {
      toast.error("Añade al menos 2 paradas para compartir la ruta.");
      return;
    }
    const price = Math.round(distance * rate);
    const lines = [
      "🛵 *NeoCharge Mensajería*",
      "",
      `📏 Distancia: ${distance.toFixed(2)} km${approximate ? " (aprox.)" : ""}`,
      `💰 Precio: ${formatCUP(price)} (${rate} CUP/km)`,
      "",
      "📍 *Recorrido:*",
      ...waypoints.map((w, i) => `${i + 1}. ${w.label}`),
    ];
    const text = lines.join("\n");
    // 1) Compartir nativo (móvil) 2) Abrir WhatsApp con el texto listo 3) Portapapeles
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ruta NeoCharge", text });
        return;
      } catch {
        // el usuario canceló -> seguir al siguiente método
      }
    }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Resumen copiado. Pégalo en WhatsApp para compartirlo.");
    } catch {
      // último recurso: abrir WhatsApp Web con el texto
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
  };

  const price = Math.round(distance * rate);

  return (
    <div className="grid lg:grid-cols-12 gap-6 p-4 max-w-[1600px] mx-auto">
      {/* Left Sidebar: Controls & Info */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="p-6 rounded-3xl glass border-white/70 shadow-glow-brand-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-2xl nc-icon-tile-md">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Calculadora de Ruta</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mensajería NeoCharge</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> Mi Tarifa por KM (CUP)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={rate}
                  onChange={e => handleRateChange(Number(e.target.value))}
                  onBlur={flushRate}
                  className="rounded-xl pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {savingRate ? (
                    <span className="text-[10px] uppercase font-bold animate-pulse">Guardando…</span>
                  ) : rateSaved ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : null}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Se guarda automáticamente en tu perfil de mensajero.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="text-xs font-bold uppercase text-muted-foreground mb-3 block">Puntos de Venta</Label>
              <div className="grid grid-cols-1 gap-2">
                {pointsLoading ? (
                  <p className="text-[10px] text-muted-foreground italic animate-pulse">Cargando puntos de venta…</p>
                ) : salePoints.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No hay puntos de venta configurados.</p>
                ) : salePoints.map(p => (
                  <Button
                    key={p.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addSalePoint(p)}
                    className="justify-start rounded-xl h-auto py-2 text-left"
                  >
                    <Store className="w-4 h-4 mr-2 text-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-xs">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{p.address}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  <LocateFixed className="w-4 h-4 mr-2" />
                  Mi ubicación
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCoordForm(v => !v)}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  <Crosshair className="w-4 h-4 mr-2" />
                  Coordenadas
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showCoordForm ? "rotate-180" : ""}`} />
                </Button>
              </div>

              {showCoordForm && (
                <form onSubmit={handleAddCustomCoordinates} className="space-y-2 p-3 rounded-2xl bg-secondary/30 border border-border/50">
                  <Input
                    placeholder="Latitud, Longitud (Ej: 23.1259, -82.3791)"
                    value={coordInput}
                    onChange={e => setCoordInput(e.target.value)}
                    className="rounded-xl text-xs"
                    inputMode="decimal"
                  />
                  <Input
                    placeholder="Etiqueta (opcional)"
                    value={coordLabel}
                    onChange={e => setCoordLabel(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                  <Button type="submit" size="sm" className="w-full rounded-xl text-xs font-bold">
                    <Plus className="w-3 h-3 mr-1" /> Añadir parada
                  </Button>
                </form>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Recorrido ({waypoints.length})</Label>
                <Button variant="ghost" size="sm" onClick={clearWaypoints} className="h-6 text-[10px] uppercase font-bold text-destructive">
                  Limpiar
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {waypoints.map((w, i) => (
                  <div key={w.id} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30 border border-border/50 group">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{w.label}</p>
                      <p className="text-[10px] text-muted-foreground">{w.lat.toFixed(4)}, {w.lng.toFixed(4)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWaypoint(w.id)}
                      className="w-8 h-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      aria-label={`Quitar ${w.label}`}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                {waypoints.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                    <MapPin className="w-6 h-6 mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] uppercase font-bold">Haz clic en el mapa para añadir paradas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {distance > 0 && (
          <Card className="p-6 rounded-3xl shadow-glow-brand-sm bg-gradient-to-br from-brand-500 via-brand-600 to-grape-600 text-white overflow-hidden relative border border-brand-400/50">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Navigation className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-80">Distancia Total</p>
                  <p className="text-3xl font-display font-bold">{distance.toFixed(2)} km</p>
                  {approximate && (
                    <p className="text-[10px] uppercase font-bold text-amber-200 mt-1">≈ Aproximada</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold opacity-80">Precio Sugerido</p>
                  <p className="text-3xl font-display font-bold">{formatCUP(price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] bg-white/20 p-2 rounded-xl border border-white/20">
                <Info className="w-3 h-3 shrink-0" />
                <span>{approximate
                  ? "Estimación por línea recta: confirma el precio final con el cliente."
                  : "Calculado basado en recorrido real por carretera."}</span>
              </div>
              <Button
                onClick={handleShareRoute}
                className="w-full rounded-2xl bg-white text-brand-700 hover:bg-white/90 font-bold"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir ruta
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Right Content: Map */}
      <div className="lg:col-span-8 h-[70vh] lg:h-auto min-h-[500px] relative">
        <div className="absolute inset-0 rounded-3xl overflow-hidden border border-border/50 shadow-soft">
          <MapContainer
            center={[23.1136, -82.3666]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} bounds={mapBounds} />
            <MapEvents onMapClick={addWaypoint} />

            {salePoints.map(p => (
              <Marker key={`sp-${p.id}`} position={[Number(p.lat), Number(p.lng)]} icon={storeIcon()}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">🏪 {p.name}</p>
                    {p.address && <p className="text-muted-foreground">{p.address}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {waypoints.map((w, i) => (
              <Marker key={w.id} position={[w.lat, w.lng]} icon={numberedIcon(i + 1)}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{i + 1}. {w.label}</p>
                    <p className="text-muted-foreground">{w.lat.toFixed(5)}, {w.lng.toFixed(5)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {route.length > 0 && (
              <Polyline positions={route} color="#9e5f8f" weight={5} opacity={0.85} />
            )}
          </MapContainer>

          {/* Botón flotante de GPS sobre el mapa (móvil) */}
          <button
            onClick={handleGetCurrentLocation}
            aria-label="Usar mi ubicación actual"
            className="absolute bottom-4 right-4 z-10 w-11 h-11 rounded-2xl bg-white shadow-lg border border-border/50 flex items-center justify-center text-primary active:scale-95 transition-transform"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
          <Bike className="w-3.5 h-3.5" />
          Toca el mapa para añadir paradas · arrastra para moverte · pellizca para zoom
        </p>
      </div>
    </div>
  );
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

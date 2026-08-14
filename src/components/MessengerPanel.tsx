import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MapPin, Navigation, Trash2, Plus, Calculator, DollarSign, ArrowRight, Store, Home } from "lucide-react";
import { formatCUP } from "@/lib/format";

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
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

export function MessengerPanel() {
  const { user, profile } = useAuth();
  const [rate, setRate] = useState(300);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState(0); // in km
  const [loading, setLoading] = useState(false);
  const [salePoints, setSalePoints] = useState<any[]>([]);

  // Fetch messenger rate and sale points
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [{ data: mProfile }, { data: points }] = await Promise.all([
        supabase.from("messenger_profiles").select("rate_per_km").eq("user_id", user.id).maybeSingle(),
        supabase.from("sale_points").select("*").eq("is_active", true)
      ]);

      if (mProfile) setRate(Number(mProfile.rate_per_km));
      if (points) setSalePoints(points);
    };
    load();
  }, [user]);

  const calculateRoute = useCallback(async () => {
    if (waypoints.length < 2) return;
    setLoading(true);
    try {
      const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(";");
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
      const data = await res.json();
      
      if (data.code === "Ok") {
        const routeCoords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        setRoute(routeCoords);
        setDistance(data.routes[0].distance / 1000); // meters to km
      } else {
        toast.error("No se pudo calcular la ruta por carretera.");
      }
    } catch (error) {
      toast.error("Error al conectar con el servicio de mapas.");
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
    }
  }, [waypoints, calculateRoute]);

  const addWaypoint = (lat: number, lng: number, label: string = "Nueva parada") => {
    const newWp: Waypoint = {
      id: Math.random().toString(36).substr(2, 9),
      lat,
      lng,
      label
    };
    setWaypoints([...waypoints, newWp]);
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(waypoints.filter(w => w.id !== id));
  };

  const addSalePoint = (point: any) => {
    addWaypoint(Number(point.lat), Number(point.lng), `Local: ${point.name}`);
  };

  const clearWaypoints = () => {
    setWaypoints([]);
    setRoute([]);
    setDistance(0);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 p-4 max-w-[1600px] mx-auto">
      {/* Left Sidebar: Controls & Info */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="p-6 rounded-3xl shadow-soft border-border/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
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
              <Input 
                type="number" 
                value={rate} 
                onChange={e => setRate(Number(e.target.value))} 
                className="rounded-xl"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="text-xs font-bold uppercase text-muted-foreground mb-3 block">Puntos de Venta</Label>
              <div className="grid grid-cols-1 gap-2">
                {salePoints.map(p => (
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
                {salePoints.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic">No hay puntos de venta configurados.</p>
                )}
              </div>
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
                      className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
          <Card className="p-6 rounded-3xl shadow-soft bg-primary text-white overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Navigation className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-80">Distancia Total</p>
                  <p className="text-3xl font-display font-bold">{distance.toFixed(2)} km</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold opacity-80">Precio Sugerido</p>
                  <p className="text-3xl font-display font-bold">{formatCUP(Math.round(distance * rate))}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] bg-white/20 p-2 rounded-xl border border-white/20">
                <Info className="w-3 h-3" />
                <span>Calculado basado en recorrido real por carretera.</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Right Content: Map */}
      <div className="lg:col-span-8 h-[700px] lg:h-auto min-h-[500px] relative">
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
            <MapEvents onMapClick={addWaypoint} />
            
            {waypoints.map((w, i) => (
              <Marker key={w.id} position={[w.lat, w.lng]}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{w.label}</p>
                    <p className="text-muted-foreground">Parada #{i + 1}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {route.length > 0 && (
              <Polyline positions={route} color="#0066FF" weight={4} opacity={0.7} dashArray="10, 10" />
            )}
          </MapContainer>
        </div>
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

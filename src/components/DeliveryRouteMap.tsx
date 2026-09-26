import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons (sin @ts-ignore: acceso tipado al prototipo)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  origin: LatLng;
  dest: LatLng;
  originLabel?: string;
}

function dotIcon(color: string, emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:15px;">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Ajusta la vista para que quepan origen y destino
function FitBounds({ origin, dest }: { origin: LatLng; dest: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [origin.lat, origin.lng],
        [dest.lat, dest.lng],
      ],
      { padding: [30, 30] },
    );
  }, [map, origin.lat, origin.lng, dest.lat, dest.lng]);
  return null;
}

/**
 * Mapa de la ruta de mensajería: origen (tienda) → destino (cliente).
 * Dibuja la ruta real por carretera usando OSRM.
 */
export function DeliveryRouteMap({ origin, dest, originLabel = "NeoCharge" }: Props) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchRoute = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`,
        );
        const data = await res.json();
        if (!cancelled) {
          if (data.code === "Ok" && data.routes?.[0]) {
            setRoute(
              data.routes[0].geometry.coordinates.map(
                (c: number[]) => [c[1], c[0]] as [number, number],
              ),
            );
          } else {
            // Sin ruta por carretera: línea recta como fallback visual
            setRoute([
              [origin.lat, origin.lng],
              [dest.lat, dest.lng],
            ]);
          }
        }
      } catch {
        if (!cancelled) {
          setRoute([
            [origin.lat, origin.lng],
            [dest.lat, dest.lng],
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRoute();
    return () => {
      cancelled = true;
    };
  }, [origin.lat, origin.lng, dest.lat, dest.lng]);

  const center: [number, number] = [(origin.lat + dest.lat) / 2, (origin.lng + dest.lng) / 2];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-soft" style={{ height: 250 }}>
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} className="z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds origin={origin} dest={dest} />
        <Marker position={[origin.lat, origin.lng]} icon={dotIcon("#2563eb", "⚡")}>
          <Popup>
            <div className="text-xs">
              <p className="font-bold">{originLabel}</p>
              <p className="text-muted-foreground">Origen del envío</p>
            </div>
          </Popup>
        </Marker>
        <Marker position={[dest.lat, dest.lng]} icon={dotIcon("#dc2626", "📍")}>
          <Popup>
            <div className="text-xs">
              <p className="font-bold">Tu ubicación</p>
              <p className="text-muted-foreground">Destino del envío</p>
            </div>
          </Popup>
        </Marker>
        {route.length > 0 && (
          <Polyline positions={route} color="#2563eb" weight={5} opacity={0.85} />
        )}
      </MapContainer>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-[500] pointer-events-none">
          <span className="text-xs text-muted-foreground font-semibold">Trazando ruta…</span>
        </div>
      )}
    </div>
  );
}

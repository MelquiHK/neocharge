import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { MapPin, Check } from "lucide-react";

interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  /** Centro inicial del mapa (tienda o La Habana). */
  center: LatLng;
  /** Punto ya elegido antes, si lo hay. */
  initialPoint?: LatLng | null;
  /** Se llama al confirmar el punto elegido. */
  onPick: (lat: number, lng: number) => void;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="background:#2563eb;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">📍</span></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 34],
});

/** Coloca/mueve el pin donde el cliente toca el mapa. */
function TapToPick({ onTap }: { onTap: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onTap({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * Mapa para que el cliente elija su ubicación tocando.
 * Gratis: Leaflet + OpenStreetMap, sin API key.
 */
export function LocationPickerMap({ center, initialPoint = null, onPick }: Props) {
  const [picked, setPicked] = useState<LatLng | null>(initialPoint);

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border-2 border-border" style={{ height: 280 }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <TapToPick onTap={setPicked} />
          {picked && <Marker position={[picked.lat, picked.lng]} icon={pinIcon} />}
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" />
        {picked ? "Pin colocado. Tócalo de nuevo en el mapa para moverlo." : "Toca el mapa donde vives para colocar el pin."}
      </p>
      <Button
        type="button"
        onClick={() => picked && onPick(picked.lat, picked.lng)}
        disabled={!picked}
        variant="hero"
        className="w-full"
      >
        <Check className="w-4 h-4" /> Usar esta ubicación
      </Button>
    </div>
  );
}

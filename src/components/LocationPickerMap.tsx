import { useEffect, useRef, useState } from "react";
import { Map as MlMap, Marker as MlMarker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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

/** Estilo vectorial moderno tipo maps.me: gratis, sin API key. */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

function makePinEl(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<div style="background:#2563eb;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">📍</span></div>`;
  return el;
}

/**
 * Mapa para que el cliente elija su ubicación tocando.
 * Vectorial moderno (MapLibre + OpenFreeMap), gratis y sin API key.
 */
export function LocationPickerMap({ center, initialPoint = null, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRef = useRef<MlMarker | null>(null);
  const [picked, setPicked] = useState<LatLng | null>(initialPoint);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MlMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom: 13,
    });
    // Sin zoom con la rueda para no atrapar el scroll de la página
    map.scrollZoom.disable();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("click", (e) => {
      const p = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      setPicked(p);
      if (markerRef.current) {
        markerRef.current.setLngLat([p.lng, p.lat]);
      } else {
        markerRef.current = new MlMarker({ element: makePinEl() })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
      }
    });

    // Si ya había un punto elegido, mostrarlo
    if (initialPoint) {
      markerRef.current = new MlMarker({ element: makePinEl() })
        .setLngLat([initialPoint.lng, initialPoint.lat])
        .addTo(map);
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden border-2 border-border"
        style={{ height: 280 }}
      />
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" />
        {picked ? "Pin colocado. Tócalo de nuevo en el mapa para moverlo." : "Toca el mapa donde vives para colocar el pin."}
      </p>
      <Button
        type="button"
        onClick={() => picked && onPickRef.current(picked.lat, picked.lng)}
        disabled={!picked}
        variant="hero"
        className="w-full"
      >
        <Check className="w-4 h-4" /> Usar esta ubicación
      </Button>
    </div>
  );
}

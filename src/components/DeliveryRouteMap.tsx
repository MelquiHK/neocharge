import { useEffect, useRef, useState } from "react";
import { Map as MlMap, Marker as MlMarker, NavigationControl, Popup } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  origin: LatLng;
  dest: LatLng;
  originLabel?: string;
}

/** Estilo vectorial moderno tipo maps.me: gratis, sin API key. */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

function dotEl(color: string, emoji: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:15px;">${emoji}</div>`;
  return el;
}

/**
 * Mapa de la ruta de mensajería: origen (tienda) → destino (cliente).
 * Dibuja la ruta real por carretera usando OSRM, sobre mapa vectorial moderno.
 */
export function DeliveryRouteMap({ origin, dest, originLabel = "NeoCharge" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const map = new MlMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [(origin.lng + dest.lng) / 2, (origin.lat + dest.lat) / 2],
      zoom: 13,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const originMarker = new MlMarker({ element: dotEl("#65a30d", "⚡") })
      .setLngLat([origin.lng, origin.lat])
      .setPopup(
        new Popup({ offset: 18 }).setHTML(
          `<div style="font-size:12px"><p style="font-weight:bold;margin:0">${originLabel}</p><p style="color:#666;margin:0">Origen del envío</p></div>`,
        ),
      )
      .addTo(map);

    const destMarker = new MlMarker({ element: dotEl("#dc2626", "📍") })
      .setLngLat([dest.lng, dest.lat])
      .setPopup(
        new Popup({ offset: 18 }).setHTML(
          `<div style="font-size:12px"><p style="font-weight:bold;margin:0">Tu ubicación</p><p style="color:#666;margin:0">Destino del envío</p></div>`,
        ),
      )
      .addTo(map);

    const drawRoute = (coords: [number, number][]) => {
      if (cancelled) return;
      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      };
      if (map.getSource("route")) {
        (map.getSource("route") as GeoJSONSource).setData(geojson);
      } else {
        map.addSource("route", { type: "geojson", data: geojson });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          paint: { "line-color": "#65a30d", "line-width": 5, "line-opacity": 0.85 },
        });
      }
      map.fitBounds(
        [
          [origin.lng, origin.lat],
          [dest.lng, dest.lat],
        ],
        { padding: 30 },
      );
    };

    const straight: [number, number][] = [
      [origin.lng, origin.lat],
      [dest.lng, dest.lat],
    ];

    setLoading(true);
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.code === "Ok" && data.routes?.[0]) {
          drawRoute(data.routes[0].geometry.coordinates as [number, number][]);
        } else {
          drawRoute(straight);
        }
      })
      .catch(() => drawRoute(straight))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      originMarker.remove();
      destMarker.remove();
      map.remove();
    };
  }, [origin.lat, origin.lng, dest.lat, dest.lng, originLabel]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/70 shadow-glow-volt-sm" style={{ height: 250 }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} className="z-0" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-[500] pointer-events-none">
          <span className="text-xs text-muted-foreground font-semibold">Trazando ruta…</span>
        </div>
      )}
    </div>
  );
}

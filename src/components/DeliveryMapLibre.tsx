import { useEffect, useRef } from "react";
import {
  Map as MlMap,
  Marker as MlMarker,
  Popup as MlPopup,
  NavigationControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LatLng {
  lat: number;
  lng: number;
}

interface SalePoint extends LatLng {
  id: string;
  name: string;
  address?: string | null;
}

interface Props {
  /** Centro inicial del mapa. */
  center: LatLng;
  /** Cuando cambia, el mapa vuela suavemente a ese punto. */
  focus?: [number, number] | null;
  origin?: (LatLng & { label: string }) | null;
  otherPoints?: SalePoint[];
  stop?: LatLng | null;
  dest?: LatLng | null;
  /** Ruta en pares [lat, lng]. */
  route?: [number, number][];
  onMapClick?: (lat: number, lng: number) => void;
}

/**
 * Mismo estilo vectorial moderno que el mapa del checkout
 * (MapLibre + OpenFreeMap "bright"): gratis y sin API key.
 */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const ROUTE_SOURCE_ID = "delivery-route-src";
const ROUTE_LAYER_ID = "delivery-route-line";

function dotEl(color: string, emoji: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML =
    `<div style="background:${color};width:30px;height:30px;border-radius:50%;` +
    `border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;` +
    `align-items:center;justify-content:center;font-size:15px;">${emoji}</div>`;
  return el;
}

function pinEl(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML =
    `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;` +
    `transform:rotate(-45deg);background:#2563eb;border:3px solid white;` +
    `box-shadow:0 2px 8px rgba(0,0,0,.4);"></div>`;
  return el;
}

function popupHtml(title: string, subtitle?: string | null): string {
  return (
    `<div style="font-size:12px;line-height:1.4;">` +
    `<p style="font-weight:700;margin:0;">${title}</p>` +
    (subtitle ? `<p style="margin:2px 0 0;color:#6b7280;">${subtitle}</p>` : "") +
    `</div>`
  );
}

function routeGeoJSON(route: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: route.map(([lat, lng]) => [lng, lat]),
        },
      },
    ],
  };
}

export function DeliveryMapLibre({
  center,
  focus = null,
  origin = null,
  otherPoints = [],
  stop = null,
  dest = null,
  route = [],
  onMapClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<MlMarker[]>([]);
  const styleLoadedRef = useRef(false);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    const map = new MlMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom: 13,
    });
    map.scrollZoom.disable();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      if (cancelled) return;
      styleLoadedRef.current = true;
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: routeGeoJSON([]),
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        paint: {
          "line-color": "#65a30d",
          "line-width": 4,
          "line-opacity": 0.8,
        },
      });
    });

    map.on("click", (e) => {
      onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      styleLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Volar al punto de enfoque cuando cambia
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo({
      center: [focus[1], focus[0]],
      zoom: Math.max(map.getZoom(), 14),
      duration: 1200,
    });
  }, [focus]);

  // Sincronizar marcadores
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const add = (
      el: HTMLElement,
      pos: LatLng,
      title: string,
      subtitle?: string | null,
    ) => {
      const marker = new MlMarker({ element: el })
        .setLngLat([pos.lng, pos.lat])
        .setPopup(new MlPopup({ offset: 18 }).setHTML(popupHtml(title, subtitle)))
        .addTo(map);
      markersRef.current.push(marker);
    };

    if (origin) add(dotEl("#65a30d", "🏠"), origin, origin.label, "Origen de los envíos");
    otherPoints.forEach((p) =>
      add(pinEl(), p, p.name, p.address ?? null),
    );
    if (stop)
      add(
        dotEl("#f59e0b", "🛑"),
        stop,
        "Parada intermedia",
        `${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}`,
      );
    if (dest)
      add(
        dotEl("#dc2626", "📍"),
        dest,
        "Destino",
        `${dest.lat.toFixed(5)}, ${dest.lng.toFixed(5)}`,
      );
  }, [origin, otherPoints, stop, dest]);

  // Sincronizar la línea de ruta
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    const src = map.getSource(ROUTE_SOURCE_ID) as
      | { setData: (d: unknown) => void }
      | undefined;
    src?.setData(routeGeoJSON(route));
  }, [route]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}

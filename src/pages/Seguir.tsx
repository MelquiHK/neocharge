import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Map as MlMap, Marker as MlMarker, NavigationControl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/client";

/**
 * Seguimiento en vivo del pedido (Fase 1, app de Mensajeros).
 *
 * Ruta pública SIN login: la única llave es el token del enlace
 * (?t=). La página lee SOLO la RPC get_live_tracking(token) de
 * Supabase (sondeo cada 5 s); anon no tiene ningún permiso directo
 * sobre las tablas de posiciones. Sin token o con token falso, la
 * RPC no devuelve nada y se muestra «enlace no válido», sin datos
 * de ningún pedido.
 *
 * Diseño «vidrio y malva» de la tienda: fondo blanco, glass solo en
 * las tarjetas flotantes, bordes muy redondeados, acento malva,
 * sombra con glow malva. Sin burbujas decorativas. Puerto React de
 * mensajeros/web-tracking (misma lógica: OSRM + ETA por velocidad).
 */

const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const STORE = { lat: 23.13474182, lng: -82.39116033 };
const POLL_MS = 5000;
const ROUTE_MOVE_M = 150;
const NEAR_KM = 0.3;
const CITY_SPEED_KMH = 18;

interface TrackingRow {
  order_id: string;
  delivery_status: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
  messenger_name: string | null;
  messenger_photo: string | null;
  messenger_phone: string | null;
  messenger_lat: number | null;
  messenger_lng: number | null;
  speed_kmh: number | null;
  last_seen_at: string | null;
  delivery_fee: number | null;
  eta_factor: number | null;
  eta_samples: number | null;
}

interface LatLng {
  lat: number;
  lng: number;
}

function haversineKm(a: LatLng, b: LatLng) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function fmtDist(km: number | null) {
  if (km == null || !isFinite(km)) return "—";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function fmtCup(n: number | null) {
  if (n == null) return "—";
  return `${Math.round(Number(n)).toLocaleString("es-CU")} CUP`;
}

function fmtClock(date: Date) {
  return date.toLocaleTimeString("es-CU", { hour: "numeric", minute: "2-digit" });
}

function agoText(iso: string | null) {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "ahora mismo";
  if (s < 90) return "hace 1 min";
  return `hace ${Math.round(s / 60)} min`;
}

const STEP_BY_STATUS: Record<string, number> = { asignado: 0, salio: 1, en_camino: 2, cerca: 3, entregado: 4 };
const PILL_BY_STATUS: Record<string, { text: string; cls: string }> = {
  asignado: { text: "Preparando tu pedido", cls: "bg-brand-100 text-brand-700" },
  salio: { text: "El mensajero salió", cls: "bg-brand-600 text-white" },
  en_camino: { text: "En camino", cls: "bg-brand-600 text-white" },
  cerca: { text: "Está cerca", cls: "bg-[#189a6c] text-white" },
  entregado: { text: "Entregado", cls: "bg-brand-900 text-white" },
  cancelado: { text: "Entrega cancelada", cls: "bg-brand-100 text-brand-700" },
};
const STEPS = ["Preparando", "Salió", "En camino", "Está cerca", "Entregado"];

function pinEl(bg: string, emoji: string, size = 30) {
  const el = document.createElement("div");
  el.innerHTML =
    `<div style="background:${bg};width:${size}px;height:${size}px;border-radius:50%;` +
    `border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;` +
    `align-items:center;justify-content:center;font-size:${Math.round(size * 0.55)}px;color:#fff;">${emoji}</div>`;
  return el;
}

// get_live_tracking aún no está en los tipos generados de Supabase.
const rpcTracking = (token: string) =>
  (supabase.rpc as unknown as (
    f: string,
    a?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)("get_live_tracking", { p_token: token });

export default function Seguir() {
  const [params] = useSearchParams();
  const token = params.get("t");
  const [data, setData] = useState<TrackingRow | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [offline, setOffline] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ km: number; min: number } | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<MlMap | null>(null);
  const destMarker = useRef<MlMarker | null>(null);
  const courierMarker = useRef<MlMarker | null>(null);
  const fitted = useRef(false);
  const routeCache = useRef<{ from: LatLng; km: number; min: number } | null>(null);
  const deliveredSeen = useRef(false);

  // ---- Mapa: se crea una sola vez ----
  useEffect(() => {
    if (!token || !mapRef.current || mapObj.current) return;
    const map = new MlMap({
      container: mapRef.current,
      style: MAP_STYLE,
      center: [STORE.lng, STORE.lat],
      zoom: 13,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    new MlMarker({ element: pinEl("#65a30d", "⚡") }).setLngLat([STORE.lng, STORE.lat]).addTo(map);
    mapObj.current = map;
    return () => {
      map.remove();
      mapObj.current = null;
    };
  }, [token]);

  // ---- Sondeo de la RPC ----
  useEffect(() => {
    if (!token) {
      setInvalid(true);
      return;
    }
    let stop = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      try {
        const { data: rows, error } = await rpcTracking(token);
        if (stop) return;
        if (error) throw new Error(error.message);
        setOffline(false);
        const row = (rows as TrackingRow[] | null)?.[0] ?? null;
        if (!row) {
          setInvalid(true);
          if (timer) clearInterval(timer);
          return;
        }
        setData(row);
        if (row.delivery_status === "entregado" && !deliveredSeen.current) {
          deliveredSeen.current = true;
          setTimeout(() => timer && clearInterval(timer), POLL_MS);
        }
      } catch {
        if (!stop) setOffline(true);
      }
    };
    tick();
    timer = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      if (timer) clearInterval(timer);
    };
  }, [token]);

  // ---- Marcadores y ruta cuando llegan datos ----
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !data) return;
    const dest =
      data.dest_lat != null && data.dest_lng != null
        ? { lat: Number(data.dest_lat), lng: Number(data.dest_lng) }
        : null;
    const pos =
      data.messenger_lat != null && data.messenger_lng != null
        ? { lat: Number(data.messenger_lat), lng: Number(data.messenger_lng) }
        : null;

    const apply = () => {
      if (dest && !destMarker.current) {
        destMarker.current = new MlMarker({ element: pinEl("#dc2626", "📍") })
          .setLngLat([dest.lng, dest.lat])
          .addTo(map);
      }
      if (pos) {
        if (!courierMarker.current) {
          courierMarker.current = new MlMarker({ element: pinEl("#9e5f8f", "🛵", 36) })
            .setLngLat([pos.lng, pos.lat])
            .addTo(map);
        } else {
          courierMarker.current.setLngLat([pos.lng, pos.lat]);
        }
      }
    };
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [data]);

  // Ajuste de vista (una sola vez) y ruta OSRM mensajero → destino.
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !data) return;
    const dest =
      data.dest_lat != null && data.dest_lng != null
        ? { lat: Number(data.dest_lat), lng: Number(data.dest_lng) }
        : null;
    const pos =
      data.messenger_lat != null && data.messenger_lng != null
        ? { lat: Number(data.messenger_lat), lng: Number(data.messenger_lng) }
        : null;
    if (!pos || !dest) return;

    if (!fitted.current) {
      fitted.current = true;
      const bounds: [[number, number], [number, number]] = [
        [Math.min(STORE.lng, dest.lng, pos.lng), Math.min(STORE.lat, dest.lat, pos.lat)],
        [Math.max(STORE.lng, dest.lng, pos.lng), Math.max(STORE.lat, dest.lat, pos.lat)],
      ];
      map.fitBounds(bounds, { padding: { top: 160, bottom: 240, left: 40, right: 40 } });
    }

    const drawRoute = (coords: [number, number][]) => {
      const geojson = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: coords },
      };
      const src = map.getSource("route") as GeoJSONSource | undefined;
      if (src) src.setData(geojson);
      else {
        map.addSource("route", { type: "geojson", data: geojson });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          paint: { "line-color": "#65a30d", "line-width": 5, "line-opacity": 0.85 },
        });
      }
    };

    const cached = routeCache.current;
    if (cached && haversineKm(cached.from, pos) * 1000 < ROUTE_MOVE_M) {
      setRouteInfo({ km: cached.km, min: cached.min });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pos.lng},${pos.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`,
        );
        const json = await res.json();
        if (cancelled) return;
        if (json.code === "Ok" && json.routes?.[0]) {
          const r = json.routes[0];
          drawRoute(r.geometry.coordinates);
          const info = { km: r.distance / 1000, min: r.duration / 60 };
          routeCache.current = { from: pos, ...info };
          setRouteInfo(info);
          return;
        }
        throw new Error("osrm");
      } catch {
        if (cancelled) return;
        drawRoute([
          [pos.lng, pos.lat],
          [dest.lng, dest.lat],
        ]);
        const km = haversineKm(pos, dest) * 1.3;
        const info = { km, min: (km / CITY_SPEED_KMH) * 60 };
        routeCache.current = { from: pos, ...info };
        setRouteInfo(info);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  // ---- Pantalla de enlace no válido ----
  if (invalid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/70 p-8 text-center shadow-glow-brand backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#be94ac] to-[#976a87] text-3xl text-white">
            ⚡
          </div>
          <h1 className="text-lg font-extrabold text-brand-900">Seguimiento no disponible</h1>
          <p className="mt-2 text-sm text-slate-500">
            Este enlace de seguimiento no es válido o ya venció. Pide al vendedor que te mande el enlace nuevo.
          </p>
        </div>
      </div>
    );
  }

  const status = data?.delivery_status ?? "asignado";
  const pill = PILL_BY_STATUS[status] ?? PILL_BY_STATUS.asignado;
  const stepIdx = STEP_BY_STATUS[status] ?? 0;
  const delivered = status === "entregado";
  const phone = data?.messenger_phone ? String(data.messenger_phone).replace(/[^+\d]/g, "") : null;

  const dest =
    data?.dest_lat != null && data?.dest_lng != null
      ? { lat: Number(data.dest_lat), lng: Number(data.dest_lng) }
      : null;
  const pos =
    data?.messenger_lat != null && data?.messenger_lng != null
      ? { lat: Number(data.messenger_lat), lng: Number(data.messenger_lng) }
      : null;

  let etaBig = "—";
  let etaSub = "estimado";
  let liveLine = "Buscando la última ubicación…";
  if (!data) {
    liveLine = "Buscando la última ubicación…";
  } else if (delivered) {
    etaBig = "✓";
    etaSub = "entregado";
    liveLine = "Tu pedido ya fue entregado.";
  } else if (pos && dest) {
    const km = routeInfo?.km ?? haversineKm(pos, dest) * 1.3;
    const speed = Number(data.speed_kmh ?? 0);
    const baseEtaMin = speed >= 5 ? (km / speed) * 60 : routeInfo?.min ?? (km / CITY_SPEED_KMH) * 60;
    const etaFactor = data.eta_factor != null ? Number(data.eta_factor) : null;
    const etaSamples = data.eta_samples != null ? Number(data.eta_samples) : null;
    const useLearnedFactor =
      etaFactor != null && Number.isFinite(etaFactor) && etaFactor > 0 && etaSamples != null && etaSamples >= 3;
    const etaMin = useLearnedFactor ? baseEtaMin * etaFactor : baseEtaMin;
    etaBig = `~${Math.max(1, Math.round(etaMin))} min`;
    etaSub = useLearnedFactor
      ? "según entregas pasadas de tu zona"
      : `llega ${fmtClock(new Date(Date.now() + etaMin * 60000))}`;
    const stale = data.last_seen_at && Date.now() - new Date(data.last_seen_at).getTime() > 90000;
    liveLine = stale
      ? `Última ubicación ${agoText(data.last_seen_at)} (puede haber perdido la conexión)`
      : "En camino hacia tu dirección";
  } else {
    liveLine =
      status === "asignado"
        ? "Tu pedido está en preparación. El mensajero saldrá pronto."
        : "El mensajero salió; esperando su primera ubicación…";
  }
  const near = !delivered && pos && dest && (routeInfo?.km ?? haversineKm(pos, dest) * 1.3) < NEAR_KM;

  const glass =
    "rounded-3xl border border-white/70 bg-white/70 shadow-[0_10px_34px_rgba(158,95,143,0.45)] backdrop-blur-xl";

  return (
    <div className="fixed inset-0 bg-white">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Tarjeta superior: estado */}
      <header className={`${glass} fixed left-3 right-3 top-3 z-10 p-4 pb-3 sm:left-1/2 sm:right-auto sm:w-[430px] sm:-translate-x-1/2`}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gradient-to-br from-[#be94ac] to-[#976a87] text-xl text-white">
            ⚡
          </span>
          <div>
            <p className="text-base font-extrabold leading-tight text-brand-900">NeoCharge</p>
            <p className="text-xs text-slate-500">Tu pedido en camino</p>
          </div>
          <span className={`ml-auto whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${pill.cls}`}>
            {data ? pill.text : "Cargando…"}
          </span>
        </div>
        <ol className="mt-3 flex gap-1">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1 text-center">
              <div
                className={`mx-1 h-1 rounded-full ${i <= stepIdx && data ? "bg-gradient-to-r from-brand-500 to-brand-600" : "bg-brand-100"}`}
              />
              <span className={`mt-1 block text-[10.5px] font-semibold ${i <= stepIdx && data ? "text-brand-700" : "text-slate-500"}`}>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </header>

      {/* Tarjeta inferior: mensajero + distancia + ETA */}
      <section className={`${glass} fixed bottom-3 left-3 right-3 z-10 p-4 sm:left-1/2 sm:right-auto sm:w-[430px] sm:-translate-x-1/2`}>
        <div className="flex items-center gap-3">
          {data?.messenger_photo ? (
            <img
              src={data.messenger_photo}
              alt=""
              className="h-[52px] w-[52px] flex-none rounded-full border-2 border-white object-cover shadow-glow-brand-sm"
            />
          ) : (
            <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-gradient-to-br from-[#c795b6] to-[#8a557d] text-2xl text-white">
              🛵
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-brand-900">{data?.messenger_name ?? "Tu mensajero"}</p>
            <p className="truncate text-xs text-slate-500">{liveLine}</p>
          </div>
          <div className="flex-none text-right">
            <p className="text-[22px] font-extrabold leading-none text-brand-700">{etaBig}</p>
            <p className="mt-1 text-[11px] text-slate-500">{etaSub}</p>
          </div>
        </div>

        <div className="mt-3.5 flex gap-2">
          {[
            { label: "Distancia", value: delivered ? "—" : fmtDist(routeInfo?.km ?? null) },
            {
              label: "Velocidad",
              value: data?.speed_kmh != null && !delivered ? `${Math.round(Number(data.speed_kmh))} km/h` : "—",
            },
            { label: "Mensajería", value: fmtCup(data?.delivery_fee ?? null) },
          ].map((m) => (
            <div key={m.label} className="flex-1 rounded-2xl bg-brand-50 px-2.5 py-2 text-center">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{m.label}</p>
              <p className="mt-0.5 text-[15px] font-extrabold text-[#2b2230]">{m.value}</p>
            </div>
          ))}
        </div>

        {near && (
          <div className="mt-3 rounded-2xl bg-[#e7f6ee] px-3 py-2.5 text-center text-[13px] font-bold text-[#189a6c]">
            Tu pedido está llegando. Prepárate para recibirlo.
          </div>
        )}
        {delivered && (
          <div className="mt-3 rounded-2xl bg-brand-100 px-3 py-2.5 text-center text-[13px] font-bold text-brand-700">
            Pedido entregado. ¡Gracias por tu compra!
          </div>
        )}

        {phone && !delivered && (
          <div className="mt-3 flex gap-2">
            <a href={`tel:${phone}`} className="flex-1 rounded-2xl bg-brand-900 px-3 py-3 text-center text-sm font-bold text-white">
              Llamar al mensajero
            </a>
            <a
              href={`https://wa.me/${phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-2xl bg-[#25d366] px-3 py-3 text-center text-sm font-bold text-white"
            >
              WhatsApp
            </a>
          </div>
        )}

        {data?.last_seen_at && (
          <p className="mt-2.5 text-center text-[11px] text-slate-500">
            Ubicación actualizada {agoText(data.last_seen_at)}
          </p>
        )}
        {offline && (
          <p className="mt-2 text-center text-xs font-semibold text-[#e52b2b]">
            Sin conexión en este momento. Reintentando…
          </p>
        )}
      </section>
    </div>
  );
}

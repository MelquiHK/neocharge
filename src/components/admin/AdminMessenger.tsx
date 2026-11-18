import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCUP } from "@/lib/format";
import { MapPin, Plus, Trash2, CheckCircle, XCircle, Store, Wallet, User, Navigation, Truck, UserPlus, Bike, Power, Radio, Route, History, Package, Camera, Sparkles, RefreshCw, Eraser, Clock } from "lucide-react";
import { Map as MlMap, Marker as MlMarker, NavigationControl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AdminCard,
  AdminSectionHeader,
  AdminCardTitle,
  AdminEmptyState,
  AdminLoading,
  StatusBadge,
  AdminTable,
  AdminTableHead,
  adminTh,
  adminTd,
  adminTr,
} from "./ui";

export function AdminMessenger() {
  interface SalePointRow {
    id: string;
    name: string;
    address?: string | null;
    lat?: number | string | null;
    lng?: number | string | null;
    [key: string]: unknown;
  }
  interface PaymentRequestRow {
    id: string;
    amount?: number | string | null;
    status?: string | null;
    created_at?: string | null;
    profiles?: { full_name?: string | null; username?: string | null } | null;
    [key: string]: unknown;
  }
  const [salePoints, setSalePoints] = useState<SalePointRow[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestRow[]>([]);
  const [newPoint, setNewPoint] = useState({ name: "", address: "", lat: 23.1136, lng: -82.3666 });
  const [loading, setLoading] = useState(true);

  // Cuentas de mensajero (app NeoCharge Mensajero)
  // Flujo SIN service_role: el mensajero crea su cuenta él mismo en
  // la app («Crear cuenta») y aquí solo se ACTIVA con la RPC
  // admin_set_messenger (SECURITY DEFINER, comprueba el rol admin).
  interface MessengerRow {
    user_id: string;
    email?: string | null;
    full_name?: string | null;
    phone?: string | null;
    vehicle_type?: string | null;
    is_active: boolean;
    is_messenger: boolean;
    roles: string[];
  }
  const [candidates, setCandidates] = useState<MessengerRow[]>([]);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [vehicleByUser, setVehicleByUser] = useState<Record<string, string>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Tarifa pública de envío (calculadora /calcular-envio + bot de WhatsApp)
  const [deliveryPrice, setDeliveryPrice] = useState(250);
  const [deliveryOriginId, setDeliveryOriginId] = useState("");
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Las RPC de mensajeros viven en la migración
  // 20261117200000_admin_set_messenger.sql; aún no están en los tipos
  // generados de Supabase, por eso se llama con un cast mínimo.
  const rpc = useCallback(
    (fn: string, args?: Record<string, unknown>) =>
      (supabase.rpc as unknown as (
        f: string,
        a?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args),
    [],
  );

  const loadMessengers = useCallback(async () => {
    const { data, error } = await rpc("admin_list_messenger_candidates");
    if (error) {
      // Si la función aún no está instalada en la base, el panel lo
      // dice claro (ver candidatesError en la tarjeta) en vez de
      // mostrar una lista vacía que parezca «no hay mensajeros».
      setCandidates([]);
      setCandidatesError(error.message);
      return;
    }
    setCandidatesError(null);
    const rows = (data ?? []) as {
      user_id: string;
      email?: string | null;
      full_name?: string | null;
      phone?: string | null;
      vehicle_type?: string | null;
      is_active?: boolean;
      is_messenger?: boolean;
      roles?: string[] | null;
    }[];
    setCandidates(
      rows.map((r) => ({
        user_id: r.user_id,
        email: r.email ?? null,
        full_name: r.full_name ?? null,
        phone: r.phone ?? null,
        vehicle_type: r.vehicle_type ?? null,
        is_active: r.is_active === true,
        is_messenger: r.is_messenger === true,
        roles: r.roles ?? [],
      })),
    );
  }, [rpc]);

  const setMessengerActive = async (c: MessengerRow, active: boolean) => {
    setTogglingId(c.user_id);
    try {
      const { error } = await rpc("admin_set_messenger", {
        p_user_id: c.user_id,
        p_active: active,
        p_vehicle: active ? (vehicleByUser[c.user_id] ?? c.vehicle_type ?? "motorcycle") : null,
        p_full_name: c.full_name ?? null,
        p_phone: c.phone ?? null,
      });
      if (error) throw new Error(error.message);
      toast.success(
        active
          ? "Mensajero activado. Ya puede entrar a la app y recibir pedidos."
          : "Mensajero desactivado. La app ya no lo deja entrar.",
      );
      await loadMessengers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado del mensajero.");
    } finally {
      setTogglingId(null);
    }
  };

  const vehicleLabel = (v?: string | null) =>
    v === "motorcycle" ? "Moto" : v === "bicycle" ? "Bicicleta" : v === "car" ? "Carro" : "—";

  // ── Fases 2/3: mensajeros en vivo, sugerencias, historial ──────────
  interface LiveMessengerRow {
    user_id: string;
    full_name?: string | null;
    phone?: string | null;
    vehicle_type?: string | null;
    last_lat?: number | string | null;
    last_lng?: number | string | null;
    last_seen_at?: string | null;
    current_order_id?: string | null;
    current_order_number?: string | number | null;
    current_status?: string | null;
    active_count?: number | null;
    delivered_today?: number | null;
    fees_today_cup?: number | string | null;
  }
  interface SuggestRow {
    user_id: string;
    full_name?: string | null;
    vehicle_type?: string | null;
    distance_km?: number | string | null;
    active_count?: number | null;
    delivered_today?: number | null;
    score?: number | string | null;
    reason?: string | null;
  }
  interface OrderRow {
    id: string;
    order_number?: string | number | null;
    customer_name?: string | null;
    customer_address?: string | null;
    status?: string | null;
    messenger_id?: string | null;
    delivery_fee?: number | string | null;
    created_at?: string | null;
  }
  interface DayMessengerStat {
    user_id: string;
    full_name?: string | null;
    delivered?: number | null;
    avg_minutes?: number | string | null;
    fees_cup?: number | string | null;
    orders_value_cup?: number | string | null;
  }
  interface DayZoneStat {
    zone: string;
    orders?: number | null;
  }
  interface DayPhoto {
    order_id: string;
    order_number?: string | number | null;
    photo_url: string;
    messenger_name?: string | null;
  }
  interface DayHistoryData {
    day?: string | null;
    messengers: DayMessengerStat[];
    zones: DayZoneStat[];
    photos: DayPhoto[];
  }

  const [liveMessengers, setLiveMessengers] = useState<LiveMessengerRow[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [unassignedOrders, setUnassignedOrders] = useState<OrderRow[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<OrderRow[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, SuggestRow[]>>({});
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [manualMessengerByOrder, setManualMessengerByOrder] = useState<Record<string, string>>({});
  const [dayHistory, setDayHistory] = useState<DayHistoryData | null>(null);
  const [dayHistoryError, setDayHistoryError] = useState<string | null>(null);
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<Record<string, string>>({});
  const [cleaningLocations, setCleaningLocations] = useState(false);
  const [routeMessengerId, setRouteMessengerId] = useState<string | null>(null);
  const [routeLoadingId, setRouteLoadingId] = useState<string | null>(null);

  const liveMapRef = useRef<HTMLDivElement | null>(null);
  const liveMapObj = useRef<MlMap | null>(null);
  const liveMarkersRef = useRef<Map<string, MlMarker>>(new Map());

  const timeAgoText = (iso?: string | null) => {
    if (!iso) return "sin ubicación todavía";
    const diffMs = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return "ahora mismo";
    const sec = Math.round(diffMs / 1000);
    if (sec < 45) return "ahora mismo";
    if (sec < 90) return "hace 1 min";
    const min = Math.round(sec / 60);
    if (min < 60) return `hace ${min} min`;
    const hrs = Math.floor(min / 60);
    const rem = min % 60;
    return rem > 0 ? `hace ${hrs} h ${rem} min` : `hace ${hrs} h`;
  };

  const deliveryStatusLabel = (s?: string | null) => {
    switch (s) {
      case "asignado": return "Asignado";
      case "salio": return "Salió";
      case "en_camino": return "En camino";
      case "cerca": return "Cerca";
      case "entregado": return "Entregado";
      case "cancelado": return "Cancelado";
      default: return s ?? "—";
    }
  };

  const orderStatusLabel = (s?: string | null) => {
    switch (s) {
      case "confirmed": return "Confirmado";
      case "preparing": return "Preparando";
      case "shipped": return "Enviado";
      case "delivered": return "Entregado";
      case "cancelled": return "Cancelado";
      default: return s ?? "—";
    }
  };

  const loadLiveMessengers = useCallback(async () => {
    const { data, error } = await rpc("admin_live_messengers");
    if (error) {
      setLiveMessengers([]);
      setLiveError(error.message);
      return;
    }
    setLiveError(null);
    const rows = (data ?? []) as LiveMessengerRow[];
    setLiveMessengers(Array.isArray(rows) ? rows : []);
  }, [rpc]);

  const loadUnassignedOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_address, status, messenger_id, delivery_fee, created_at")
      .is("messenger_id", null)
      .in("status", ["confirmed", "preparing"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      setUnassignedOrders([]);
      return;
    }
    setUnassignedOrders(
      ((data ?? []) as unknown as OrderRow[]).map((r) => ({ ...r, id: String(r.id) })),
    );
  }, []);

  const loadAssignedOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_address, status, messenger_id, delivery_fee, created_at")
      .not("messenger_id", "is", null)
      .in("status", ["confirmed", "preparing", "shipped"])
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      setAssignedOrders([]);
      return;
    }
    setAssignedOrders(
      ((data ?? []) as unknown as OrderRow[]).map((r) => ({ ...r, id: String(r.id) })),
    );
  }, []);

  const loadDayHistory = useCallback(async () => {
    const { data, error } = await rpc("admin_day_history", { p_day: null });
    if (error) {
      setDayHistory(null);
      setDayHistoryError(error.message);
      setSignedPhotoUrls({});
      return;
    }
    setDayHistoryError(null);
    const raw = (data ?? null) as {
      day?: string | null;
      messengers?: DayMessengerStat[] | null;
      zones?: DayZoneStat[] | null;
      photos?: DayPhoto[] | null;
    } | null;
    const parsed: DayHistoryData = {
      day: raw?.day ?? null,
      messengers: Array.isArray(raw?.messengers) ? raw!.messengers : [],
      zones: Array.isArray(raw?.zones) ? raw!.zones : [],
      photos: Array.isArray(raw?.photos) ? raw!.photos : [],
    };
    setDayHistory(parsed);
    // Firmar las fotos de entrega (bucket privado)
    if (parsed.photos.length > 0) {
      const entries: Record<string, string> = {};
      await Promise.all(
        parsed.photos.map(async (ph) => {
          if (!ph.photo_url) return;
          // Si ya es una URL completa, se usa tal cual
          if (ph.photo_url.startsWith("http")) {
            entries[ph.photo_url] = ph.photo_url;
            return;
          }
          const { data: signed } = await supabase.storage
            .from("delivery-photos")
            .createSignedUrl(ph.photo_url, 3600);
          if (signed?.signedUrl) entries[ph.photo_url] = signed.signedUrl;
        }),
      );
      setSignedPhotoUrls(entries);
    } else {
      setSignedPhotoUrls({});
    }
  }, [rpc]);

  const loadPhase23 = useCallback(async () => {
    await Promise.all([loadLiveMessengers(), loadUnassignedOrders(), loadAssignedOrders(), loadDayHistory()]);
  }, [loadLiveMessengers, loadUnassignedOrders, loadAssignedOrders, loadDayHistory]);

  const suggestMessenger = async (orderId: string) => {
    setSuggestingId(orderId);
    try {
      const { data, error } = await rpc("admin_suggest_messenger", { p_order_id: orderId });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as SuggestRow[];
      const list = Array.isArray(rows) ? rows : [];
      setSuggestions((prev) => ({ ...prev, [orderId]: list }));
      if (list.length === 0) toast.info("No hay mensajeros disponibles para sugerir ahora.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo buscar una sugerencia.");
    } finally {
      setSuggestingId(null);
    }
  };

  const assignOrder = async (orderId: string, messengerId: string) => {
    if (!messengerId) {
      toast.error("Elige un mensajero primero.");
      return;
    }
    setAssigningId(orderId);
    try {
      const { error } = await rpc("admin_reassign_order", {
        p_order_id: orderId,
        p_messenger_id: messengerId,
      });
      if (error) throw new Error(error.message);
      toast.success("Pedido asignado al mensajero.");
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      await Promise.all([loadUnassignedOrders(), loadAssignedOrders(), loadLiveMessengers()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo asignar el pedido.");
    } finally {
      setAssigningId(null);
    }
  };

  const cleanupOldLocations = async () => {
    setCleaningLocations(true);
    try {
      const { data, error } = await rpc("cleanup_old_locations");
      if (error) throw new Error(error.message);
      const count = typeof data === "number" ? data : Number(data ?? 0);
      toast.success(
        Number.isFinite(count)
          ? `Limpieza lista: se borraron ${count} ubicaciones viejas.`
          : "Limpieza lista.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo limpiar las ubicaciones viejas.");
    } finally {
      setCleaningLocations(false);
    }
  };

  const clearRouteOnMap = useCallback(() => {
    const map = liveMapObj.current;
    setRouteMessengerId(null);
    if (!map) return;
    try {
      if (map.getLayer("messenger-route-line")) map.removeLayer("messenger-route-line");
      if (map.getSource("messenger-route")) map.removeSource("messenger-route");
    } catch {
      // El mapa puede estar recreándose; no es un error para el usuario.
    }
  }, []);

  const showRouteToday = async (messengerId: string) => {
    if (routeMessengerId === messengerId) {
      clearRouteOnMap();
      return;
    }
    setRouteLoadingId(messengerId);
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("messenger_locations")
        .select("lat,lng,recorded_at")
        .eq("messenger_id", messengerId)
        .gte("recorded_at", start.toISOString())
        .order("recorded_at", { ascending: true });
      if (error) throw new Error(error.message);
      const points = ((data ?? []) as { lat: number | string; lng: number | string }[])
        .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (points.length === 0) {
        toast.info("Este mensajero no tiene recorrido guardado hoy.");
        return;
      }
      const map = liveMapObj.current;
      if (!map) {
        toast.info("El mapa todavía se está cargando. Prueba de nuevo en un momento.");
        return;
      }
      const coords: [number, number][] = points.map((p) => [p.lng, p.lat]);
      const geojson = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: coords },
      };
      const draw = () => {
        const src = map.getSource("messenger-route") as GeoJSONSource | undefined;
        if (src) {
          src.setData(geojson);
        } else {
          map.addSource("messenger-route", { type: "geojson", data: geojson });
          map.addLayer({
            id: "messenger-route-line",
            type: "line",
            source: "messenger-route",
            paint: { "line-color": "#976a87", "line-width": 4, "line-opacity": 0.9 },
            layout: { "line-cap": "round", "line-join": "round" },
          });
        }
        if (coords.length > 1) {
          const lngs = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 50, maxZoom: 15 },
          );
        } else {
          map.flyTo({ center: coords[0], zoom: 14 });
        }
      };
      if (map.loaded()) draw();
      else map.once("load", draw);
      setRouteMessengerId(messengerId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el recorrido.");
    } finally {
      setRouteLoadingId(null);
    }
  };

  // Mapa de mensajeros en vivo: se crea una vez que el panel terminó la carga inicial
  useEffect(() => {
    if (loading) return;
    if (!liveMapRef.current || liveMapObj.current) return;
    const map = new MlMap({
      container: liveMapRef.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: [-82.3666, 23.1136],
      zoom: 11,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    liveMapObj.current = map;
    return () => {
      // No destruir en cada render; solo al desmontar el componente.
    };
  }, [loading]);

  useEffect(() => {
    return () => {
      liveMarkersRef.current.forEach((m) => m.remove());
      liveMarkersRef.current.clear();
      if (liveMapObj.current) {
        liveMapObj.current.remove();
        liveMapObj.current = null;
      }
    };
  }, []);

  // Marcadores del mapa en vivo
  useEffect(() => {
    const map = liveMapObj.current;
    if (!map || loading) return;
    const apply = () => {
      const seen = new Set<string>();
      for (const m of liveMessengers) {
        if (m.last_lat == null || m.last_lng == null) continue;
        const lat = Number(m.last_lat);
        const lng = Number(m.last_lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        seen.add(m.user_id);
        const hasActive = Boolean(m.current_order_id) || Number(m.active_count ?? 0) > 0;
        const bg = hasActive ? "#ea580c" : "#9e5f8f";
        let marker = liveMarkersRef.current.get(m.user_id);
        if (!marker) {
          const el = document.createElement("div");
          el.innerHTML =
            `<div style="background:${bg};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:15px;color:#fff;">🛵</div>`;
          el.title = m.full_name ?? "Mensajero";
          marker = new MlMarker({ element: el }).setLngLat([lng, lat]).addTo(map);
          liveMarkersRef.current.set(m.user_id, marker);
        } else {
          marker.setLngLat([lng, lat]);
          const inner = marker.getElement().firstElementChild as HTMLElement | null;
          if (inner) inner.style.background = bg;
          marker.getElement().title = m.full_name ?? "Mensajero";
        }
      }
      // Quitar marcadores de mensajeros que ya no vienen
      liveMarkersRef.current.forEach((marker, id) => {
        if (!seen.has(id)) {
          marker.remove();
          liveMarkersRef.current.delete(id);
        }
      });
    };
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [liveMessengers, loading]);

  // Sondeo de mensajeros en vivo cada 15 s
  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => {
      void loadLiveMessengers();
    }, 15000);
    return () => clearInterval(t);
  }, [loading, loadLiveMessengers]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: points }, { data: requests }, { data: dcfg }] = await Promise.all([
      supabase.from("sale_points").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_requests").select("*, profiles:user_id(full_name, username)").order("created_at", { ascending: false }),
      supabase.from("site_settings").select("value").eq("key", "delivery_config").maybeSingle()
    ]);
    setSalePoints(
      (points ?? []).map((p) => ({
        ...p,
        id: String(p.id),
        name: String(p.name ?? ""),
      })),
    );
    setPaymentRequests(
      (requests ?? []).map((r) => ({
        ...r,
        id: String(r.id),
        profiles: (r.profiles as unknown as PaymentRequestRow["profiles"]) ?? null,
      })),
    );
    const v = dcfg?.value as { price_per_km?: unknown; origin_sale_point_id?: unknown } | null | undefined;
    if (v) {
      if (Number.isFinite(Number(v.price_per_km)) && Number(v.price_per_km) > 0) {
        setDeliveryPrice(Number(v.price_per_km));
      }
      if (v.origin_sale_point_id) setDeliveryOriginId(String(v.origin_sale_point_id));
    }
    await loadMessengers();
    await loadPhase23();
    setLoading(false);
  }, [loadMessengers, loadPhase23]);

  const saveDeliveryConfig = async () => {
    if (!Number.isFinite(deliveryPrice) || deliveryPrice <= 0) {
      return toast.error("El precio por km debe ser mayor que 0");
    }
    setSavingDelivery(true);
    const { error } = await supabase.from("site_settings").upsert(
      {
        key: "delivery_config",
        value: { price_per_km: deliveryPrice, origin_sale_point_id: deliveryOriginId || null },
      },
      { onConflict: "key" }
    );
    setSavingDelivery(false);
    if (error) toast.error("Error: " + error.message);
    else toast.success("Tarifa de envío guardada");
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addPoint = async () => {
    if (!newPoint.name) return toast.error("El nombre es obligatorio");
    const { error } = await supabase.from("sale_points").insert(newPoint);
    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Punto de venta añadido");
      setNewPoint({ name: "", address: "", lat: 23.1136, lng: -82.3666 });
      loadData();
    }
  };

  const deletePoint = async (id: string) => {
    const { error } = await supabase.from("sale_points").delete().eq("id", id);
    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Punto de venta eliminado");
      loadData();
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("payment_requests").update({ status }).eq("id", id);
    if (error) toast.error("Error: " + error.message);
    else {
      toast.success(`Solicitud ${status}`);
      loadData();
    }
  };

  const statusTone = (s?: string | null): "warning" | "info" | "success" | "danger" =>
    s === "pending" ? "warning" : s === "approved" ? "info" : s === "paid" ? "success" : "danger";
  const statusLabel = (s?: string | null) =>
    s === "pending" ? "Pendiente" : s === "paid" ? "Pagado" : s === "approved" ? "Aprobado" : "Rechazado";

  const messengers = candidates.filter((c) => c.is_messenger);
  const pendingCandidates = candidates.filter(
    (c) => !c.is_messenger && !c.roles.includes("admin") && !c.roles.includes("owner"),
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminSectionHeader
          icon={Truck}
          title="Mensajería"
          description="Tarifa de envío, puntos de despacho y pagos de gestores."
        />
        <AdminLoading label="Cargando mensajería…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={Truck}
        title="Mensajería"
        description="Tarifa de envío, puntos de despacho y pagos de gestores."
      />

      {/* Tarifa pública de envío (calculadora /calcular-envio + bot de WhatsApp) */}
      <AdminCard>
        <AdminCardTitle icon={Navigation} title="Tarifa de envío para clientes" />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Esta tarifa la usan la calculadora pública (/calcular-envio) y el bot de WhatsApp.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="delivery-price">Precio por km (CUP)</Label>
            <div className="relative">
              <Input
                id="delivery-price"
                type="number"
                min={0}
                inputMode="decimal"
                value={deliveryPrice}
                onChange={(e) => setDeliveryPrice(Number(e.target.value))}
                className="h-14 pr-16 text-2xl font-bold tracking-tight"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                CUP/km
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-origin">Local origen de los envíos</Label>
            <select
              id="delivery-origin"
              value={deliveryOriginId}
              onChange={(e) => setDeliveryOriginId(e.target.value)}
              className="h-14 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Automático (Vedado o el primero)</option>
              {salePoints.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button variant="hero" onClick={saveDeliveryConfig} disabled={savingDelivery} className="mt-5 h-11 w-full rounded-xl sm:w-auto sm:px-8">
          {savingDelivery ? "Guardando…" : "Guardar tarifa"}
        </Button>
      </AdminCard>

      {/* Cuentas de mensajero (app NeoCharge Mensajero) */}
      <AdminCard>
        <AdminCardTitle
          icon={Bike}
          title="Cuentas de mensajero"
          action={<StatusBadge tone="neutral">{messengers.length}</StatusBadge>}
        />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Cada mensajero crea su propia cuenta en la app NeoCharge Mensajero (botón «Crear cuenta»).
          Cuando su cuenta aparece aquí, actívala: desde ese momento puede entrar a la app y recibir
          pedidos. Si lo desactivas, la app no lo deja entrar.
        </p>
        {candidatesError ? (
          <AdminEmptyState
            icon={Bike}
            title="La activación desde el panel aún no está instalada"
            description="Falta instalar la función de activación en la base de datos. Cuando esté, aquí verás las cuentas que creen los mensajeros en la app y podrás activarlas."
            className="py-8"
          />
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mensajeros</p>
              {messengers.length === 0 ? (
                <AdminEmptyState
                  icon={Bike}
                  title="Todavía no hay mensajeros"
                  description="Activa la primera cuenta desde la lista de abajo."
                  className="py-8"
                />
              ) : (
                messengers.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{m.full_name || m.email || "Sin nombre"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {vehicleLabel(m.vehicle_type)}{m.phone ? ` · ${m.phone}` : ""}{m.email ? ` · ${m.email}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge tone={m.is_active ? "success" : "danger"}>
                        {m.is_active ? "Activo" : "Desactivado"}
                      </StatusBadge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMessengerActive(m, !m.is_active)}
                        disabled={togglingId === m.user_id}
                        className="h-10 px-3"
                      >
                        <Power className="mr-1 h-4 w-4" />
                        {togglingId === m.user_id ? "…" : m.is_active ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Cuentas por activar</p>
              {pendingCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay cuentas esperando activación. Cuando un mensajero cree su cuenta en la app, aparece aquí.
                </p>
              ) : (
                pendingCandidates.map((c) => (
                  <div key={c.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{c.full_name || c.email || "Sin nombre"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.email ?? ""}{c.phone ? ` · ${c.phone}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={vehicleByUser[c.user_id] ?? "motorcycle"}
                        onChange={(e) => setVehicleByUser({ ...vehicleByUser, [c.user_id]: e.target.value })}
                        className="h-10 rounded-xl border border-input bg-background px-2 text-sm"
                        aria-label="Vehículo del mensajero"
                      >
                        <option value="motorcycle">Moto</option>
                        <option value="bicycle">Bicicleta</option>
                        <option value="car">Carro</option>
                      </select>
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => setMessengerActive(c, true)}
                        disabled={togglingId === c.user_id}
                        className="h-10 px-3"
                      >
                        <UserPlus className="mr-1 h-4 w-4" />
                        {togglingId === c.user_id ? "…" : "Activar como mensajero"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </AdminCard>

      {/* Mensajeros en vivo — Fase 2/3 */}
      <AdminCard>
        <AdminCardTitle
          icon={Radio}
          title="Mensajeros en vivo"
          action={
            <div className="flex items-center gap-2">
              <StatusBadge tone="neutral">{liveMessengers.length}</StatusBadge>
              <Button variant="outline" size="sm" onClick={() => void loadLiveMessengers()} className="h-9 px-3">
                <RefreshCw className="mr-1 h-4 w-4" /> Actualizar
              </Button>
            </div>
          }
        />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Posición de cada mensajero en el mapa. Se actualiza solo cada 15 segundos. El marcador naranja lleva una entrega activa; el malva está libre.
        </p>
        {liveError ? (
          <AdminEmptyState
            icon={Radio}
            title="La vista en vivo aún no está instalada"
            description="Falta instalar la función de mensajeros en vivo en la base de datos. Cuando esté, aquí verás el mapa con la posición de cada mensajero."
            className="py-8"
          />
        ) : (
          <div className="space-y-4">
            <div ref={liveMapRef} className="h-[320px] w-full overflow-hidden rounded-2xl border border-border/60" />
            {liveMessengers.length === 0 ? (
              <AdminEmptyState
                icon={Bike}
                title="No hay mensajeros con ubicación"
                description="Cuando un mensajero abra la app y comparta su ubicación, aparece en el mapa."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {liveMessengers.map((m) => {
                  const hasActive = Boolean(m.current_order_id) || Number(m.active_count ?? 0) > 0;
                  const isRouteShown = routeMessengerId === m.user_id;
                  return (
                    <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${hasActive ? "bg-orange-500/15" : "bg-primary/10"}`}>
                          <Bike className={`h-5 w-5 ${hasActive ? "text-orange-600" : "text-primary"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{m.full_name || "Sin nombre"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {vehicleLabel(m.vehicle_type)}{m.phone ? ` · ${m.phone}` : ""} · última ubicación {timeAgoText(m.last_seen_at)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.current_order_id
                              ? `Pedido actual: #${m.current_order_number ?? "—"} · ${deliveryStatusLabel(m.current_status)}`
                              : Number(m.active_count ?? 0) > 0
                                ? `${m.active_count} entrega(s) activa(s)`
                                : "Sin entrega ahora"}
                            {` · Hoy: ${Number(m.delivered_today ?? 0)} entregas · ${formatCUP(Number(m.fees_today_cup ?? 0))}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge tone={hasActive ? "warning" : "success"}>{hasActive ? "En entrega" : "Libre"}</StatusBadge>
                        <Button
                          variant={isRouteShown ? "hero" : "outline"}
                          size="sm"
                          onClick={() => void showRouteToday(m.user_id)}
                          disabled={routeLoadingId === m.user_id}
                          className="h-10 px-3"
                        >
                          <Route className="mr-1 h-4 w-4" />
                          {routeLoadingId === m.user_id ? "Cargando…" : isRouteShown ? "Quitar recorrido" : "Ver recorrido de hoy"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {routeMessengerId && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearRouteOnMap} className="h-9 px-3 text-xs">
                      Quitar recorrido del mapa
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </AdminCard>

      {/* Pedidos sin mensajero — Fase 2/3 */}
      <AdminCard>
        <AdminCardTitle
          icon={Package}
          title="Pedidos sin mensajero"
          action={<StatusBadge tone="neutral">{unassignedOrders.length}</StatusBadge>}
        />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Pedidos confirmados o en preparación que todavía no tienen mensajero. Puedes pedir una sugerencia o asignar a mano.
        </p>
        {unassignedOrders.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title="No hay pedidos sin mensajero"
            description="Todos los pedidos confirmados ya tienen mensajero o no hay pedidos nuevos."
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {unassignedOrders.map((o) => {
              const suggList = suggestions[o.id] ?? [];
              const best = suggList[0];
              const manualId = manualMessengerByOrder[o.id] ?? "";
              const activeOptions = candidates.filter((c) => c.is_messenger && c.is_active);
              return (
                <div key={o.id} className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        Pedido #{o.order_number ?? "—"} · {o.customer_name || "Sin nombre"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{o.customer_address || "Sin dirección"}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.created_at ? new Date(o.created_at).toLocaleString("es-CU") : ""} · {orderStatusLabel(o.status)}
                        {o.delivery_fee != null ? ` · Mensajería ${formatCUP(Number(o.delivery_fee))}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone="warning">{orderStatusLabel(o.status)}</StatusBadge>
                  </div>

                  {best && (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                      <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary">
                        <Sparkles className="h-3.5 w-3.5" /> Mejor sugerencia
                      </p>
                      <p className="mt-1 text-sm font-bold">{best.full_name || "Sin nombre"} · {vehicleLabel(best.vehicle_type)}</p>
                      <p className="text-xs text-muted-foreground">{best.reason || "Es la mejor opción ahora."}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {best.distance_km != null && Number.isFinite(Number(best.distance_km))
                          ? `Distancia: ${Number(best.distance_km).toFixed(1)} km · `
                          : "Distancia: sin datos · "}
                        {`Carga activa: ${Number(best.active_count ?? 0)} · Entregas hoy: ${Number(best.delivered_today ?? 0)}`}
                        {best.score != null && Number.isFinite(Number(best.score)) ? ` · Puntos: ${Number(best.score).toFixed(1)}` : ""}
                      </p>
                      <Button
                        variant="hero"
                        size="sm"
                        className="mt-2 h-10 px-4"
                        disabled={assigningId === o.id}
                        onClick={() => void assignOrder(o.id, best.user_id)}
                      >
                        {assigningId === o.id ? "Asignando…" : `Asignar a ${best.full_name || "este mensajero"}`}
                      </Button>
                      {suggList.length > 1 && (
                        <div className="mt-3 space-y-1 border-t border-border/50 pt-2">
                          {suggList.slice(1).map((s) => (
                            <div key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span>
                                <span className="font-semibold">{s.full_name || "Sin nombre"}</span>
                                {s.distance_km != null && Number.isFinite(Number(s.distance_km)) ? ` · ${Number(s.distance_km).toFixed(1)} km` : ""}
                                {` · ${Number(s.active_count ?? 0)} activa(s)`}
                                {s.reason ? ` · ${s.reason}` : ""}
                              </span>
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={assigningId === o.id} onClick={() => void assignOrder(o.id, s.user_id)}>
                                Asignar
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-3"
                      disabled={suggestingId === o.id}
                      onClick={() => void suggestMessenger(o.id)}
                    >
                      <Sparkles className="mr-1 h-4 w-4" />
                      {suggestingId === o.id ? "Buscando…" : "Sugerir mensajero"}
                    </Button>
                    <select
                      value={manualId}
                      onChange={(e) => setManualMessengerByOrder({ ...manualMessengerByOrder, [o.id]: e.target.value })}
                      className="h-10 min-w-[180px] flex-1 rounded-xl border border-input bg-background px-2 text-sm sm:flex-none"
                      aria-label="Elegir mensajero a mano"
                    >
                      <option value="">Asignar a mano…</option>
                      {activeOptions.map((mm) => (
                        <option key={mm.user_id} value={mm.user_id}>
                          {mm.full_name || mm.email || "Sin nombre"} ({vehicleLabel(mm.vehicle_type)})
                        </option>
                      ))}
                      {activeOptions.length === 0 &&
                        liveMessengers.map((lm) => (
                          <option key={lm.user_id} value={lm.user_id}>
                            {lm.full_name || "Sin nombre"} ({vehicleLabel(lm.vehicle_type)})
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="hero"
                      size="sm"
                      className="h-10 px-3"
                      disabled={!manualId || assigningId === o.id}
                      onClick={() => void assignOrder(o.id, manualId)}
                    >
                      {assigningId === o.id ? "Asignando…" : "Asignar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>

      {/* Pedidos asignados (cambiar mensajero) — Fase 2/3 */}
      <AdminCard>
        <AdminCardTitle
          icon={Truck}
          title="Pedidos asignados (cambiar mensajero)"
          action={<StatusBadge tone="neutral">{assignedOrders.length}</StatusBadge>}
        />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Solo se puede cambiar el mensajero si el pedido todavía no salió. Si ya salió o fue entregado, el sistema lo frena y te avisa.
        </p>
        {assignedOrders.length === 0 ? (
          <AdminEmptyState
            icon={Truck}
            title="No hay pedidos asignados por cambiar"
            description="No hay pedidos con mensajero en estado confirmado, preparando o enviado."
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {assignedOrders.map((o) => {
              const current = candidates.find((c) => c.user_id === o.messenger_id) ?? liveMessengers.find((lm) => lm.user_id === o.messenger_id);
              const currentName = (current as { full_name?: string | null } | undefined)?.full_name || "Mensajero actual";
              const selected = manualMessengerByOrder[`assigned-${o.id}`] ?? "";
              const activeOptions = candidates.filter((c) => c.is_messenger && c.is_active);
              return (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">Pedido #{o.order_number ?? "—"} · {o.customer_name || "Sin nombre"}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.customer_address || "Sin dirección"}</p>
                    <p className="text-xs text-muted-foreground">
                      Mensajero ahora: <span className="font-semibold">{currentName}</span> · {orderStatusLabel(o.status)}
                      {o.created_at ? ` · ${new Date(o.created_at).toLocaleString("es-CU")}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <select
                      value={selected}
                      onChange={(e) => setManualMessengerByOrder({ ...manualMessengerByOrder, [`assigned-${o.id}`]: e.target.value })}
                      className="h-10 rounded-xl border border-input bg-background px-2 text-sm"
                      aria-label="Nuevo mensajero"
                    >
                      <option value="">Cambiar a…</option>
                      {activeOptions
                        .filter((mm) => mm.user_id !== o.messenger_id)
                        .map((mm) => (
                          <option key={mm.user_id} value={mm.user_id}>
                            {mm.full_name || mm.email || "Sin nombre"} ({vehicleLabel(mm.vehicle_type)})
                          </option>
                        ))}
                      {activeOptions.length === 0 &&
                        liveMessengers
                          .filter((lm) => lm.user_id !== o.messenger_id)
                          .map((lm) => (
                            <option key={lm.user_id} value={lm.user_id}>
                              {lm.full_name || "Sin nombre"} ({vehicleLabel(lm.vehicle_type)})
                            </option>
                          ))}
                    </select>
                    <Button
                      variant="hero"
                      size="sm"
                      className="h-10 px-3"
                      disabled={!selected || assigningId === o.id}
                      onClick={() => void assignOrder(o.id, selected)}
                    >
                      {assigningId === o.id ? "Cambiando…" : "Cambiar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>

      {/* Historial de hoy — Fase 2/3 */}
      <AdminCard>
        <AdminCardTitle
          icon={History}
          title="Historial de hoy"
          action={
            <Button variant="outline" size="sm" onClick={() => void cleanupOldLocations()} disabled={cleaningLocations} className="h-9 px-3">
              <Eraser className="mr-1 h-4 w-4" />
              {cleaningLocations ? "Limpiando…" : "Limpiar ubicaciones viejas (más de 30 días)"}
            </Button>
          }
        />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Resumen del día por mensajero y por zona, con las fotos de entrega. El botón de limpieza borra las ubicaciones de más de 30 días.
        </p>
        {dayHistoryError ? (
          <AdminEmptyState
            icon={History}
            title="El historial aún no está instalado"
            description="Falta instalar la función de historial en la base de datos. Cuando esté, aquí verás el resumen del día."
            className="py-8"
          />
        ) : !dayHistory ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Cargando historial…</p>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Por mensajero{dayHistory.day ? ` · ${dayHistory.day}` : ""}
              </p>
              {dayHistory.messengers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Hoy todavía no hay entregas registradas.</p>
              ) : (
                <AdminTable className="border-border/60">
                  <AdminTableHead>
                    <tr>
                      <th className={adminTh}>Mensajero</th>
                      <th className={adminTh}>Entregas</th>
                      <th className={adminTh}>Tiempo medio</th>
                      <th className={adminTh}>Mensajería cobrada</th>
                      <th className={adminTh}>Valor de pedidos</th>
                    </tr>
                  </AdminTableHead>
                  <tbody>
                    {dayHistory.messengers.map((ms) => (
                      <tr key={ms.user_id} className={adminTr}>
                        <td className={adminTd}><span className="font-semibold">{ms.full_name || "Sin nombre"}</span></td>
                        <td className={adminTd}>{Number(ms.delivered ?? 0)}</td>
                        <td className={adminTd}>{ms.avg_minutes != null && Number.isFinite(Number(ms.avg_minutes)) ? `${Math.round(Number(ms.avg_minutes))} min` : "—"}</td>
                        <td className={adminTd}><span className="font-bold text-primary">{formatCUP(Number(ms.fees_cup ?? 0))}</span></td>
                        <td className={adminTd}>{formatCUP(Number(ms.orders_value_cup ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Zonas con más pedidos</p>
              {dayHistory.zones.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin datos de zonas hoy.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dayHistory.zones.map((z) => (
                    <span key={z.zone} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-semibold">
                      <MapPin className="h-3 w-3" /> {z.zone} · {Number(z.orders ?? 0)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Camera className="h-3.5 w-3.5" /> Fotos de entrega
              </p>
              {dayHistory.photos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Hoy no hay fotos de entrega.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {dayHistory.photos.map((ph) => {
                    const url = signedPhotoUrls[ph.photo_url];
                    return (
                      <div key={`${ph.order_id}-${ph.photo_url}`} className="space-y-1">
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-border/60">
                            <img src={url} alt={`Entrega #${ph.order_number ?? ""}`} className="aspect-square w-full object-cover" loading="lazy" />
                          </a>
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 text-muted-foreground">
                            <Camera className="h-5 w-5" />
                          </div>
                        )}
                        <p className="truncate text-center text-[11px] text-muted-foreground">
                          #{ph.order_number ?? "—"}{ph.messenger_name ? ` · ${ph.messenger_name}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => void loadDayHistory()} className="h-9 px-3 text-xs">
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Actualizar historial
              </Button>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Sale Points Management */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard>
          <AdminCardTitle icon={Plus} title="Nuevo punto de venta" />
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre del local</Label>
              <Input className="h-11" value={newPoint.name} onChange={e => setNewPoint({...newPoint, name: e.target.value})} placeholder="Ej: Almacén Central" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input className="h-11" value={newPoint.address} onChange={e => setNewPoint({...newPoint, address: e.target.value})} placeholder="Ej: Calle 10 #5..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Latitud</Label>
                <Input className="h-11" type="number" inputMode="decimal" value={newPoint.lat} onChange={e => setNewPoint({...newPoint, lat: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Longitud</Label>
                <Input className="h-11" type="number" inputMode="decimal" value={newPoint.lng} onChange={e => setNewPoint({...newPoint, lng: Number(e.target.value)})} />
              </div>
            </div>
            <Button variant="hero" onClick={addPoint} className="mt-1 h-11 w-full rounded-xl">Añadir punto</Button>
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <AdminCardTitle
            icon={Store}
            title="Puntos de venta activos"
            action={<StatusBadge tone="neutral">{salePoints.length}</StatusBadge>}
          />
          {salePoints.length === 0 ? (
            <AdminEmptyState
              icon={Store}
              title="No hay puntos de venta"
              description="Añade el primero con el formulario."
              className="py-8"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {salePoints.map(p => (
                <div key={p.id} className="flex items-start justify-between gap-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold">{p.name}</p>
                    {p.address && (
                      <p className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{p.address}</span>
                      </p>
                    )}
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {Number(p.lat ?? 0).toFixed(4)}, {Number(p.lng ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePoint(p.id)}
                    className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                    aria-label={`Eliminar ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      {/* Payment Requests */}
      <AdminCard>
        <AdminCardTitle
          icon={Wallet}
          title="Solicitudes de pago de gestores"
          action={<StatusBadge tone="neutral">{paymentRequests.length}</StatusBadge>}
        />
        {paymentRequests.length === 0 ? (
          <AdminEmptyState
            icon={Wallet}
            title="Sin solicitudes de pago"
            description="No hay solicitudes de pago de gestores por ahora."
            className="py-8"
          />
        ) : (
          <AdminTable className="border-0">
            <AdminTableHead>
              <tr>
                <th className={adminTh}>Gestor</th>
                <th className={adminTh}>Monto</th>
                <th className={adminTh}>Fecha</th>
                <th className={adminTh}>Estado</th>
                <th className={`${adminTh} text-right`}>Acciones</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {paymentRequests.map(r => (
                <tr key={r.id} className={adminTr}>
                  <td className={adminTd}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{r.profiles?.full_name || r.profiles?.username}</p>
                        {r.profiles?.username && (
                          <p className="text-[10px] text-muted-foreground">@{r.profiles?.username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={adminTd}>
                    <span className="whitespace-nowrap font-bold text-primary">{formatCUP(Number(r.amount ?? 0))}</span>
                  </td>
                  <td className={adminTd}>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("es-CU")}
                    </span>
                  </td>
                  <td className={adminTd}>
                    <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>
                  </td>
                  <td className={adminTd}>
                    <div className="flex items-center justify-end gap-2">
                      {r.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" className="h-10 px-3 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300" onClick={() => updateRequestStatus(r.id, 'approved')}>
                            <CheckCircle className="mr-1 h-4 w-4" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="h-10 px-3 text-destructive hover:bg-destructive/10" onClick={() => updateRequestStatus(r.id, 'rejected')}>
                            <XCircle className="mr-1 h-4 w-4" /> Rechazar
                          </Button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <Button size="sm" variant="hero" className="h-10 px-3" onClick={() => updateRequestStatus(r.id, 'paid')}>
                          Marcar pagado
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}

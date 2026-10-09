import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { showBrowserNotification } from '@/lib/notifications';
import { formatMoney } from '@/lib/format';
import { getUnseenRecords, isGenuinelyNew } from '@/hooks/admin/order-notifications.utils';

interface AdminNotification {
  id: string;
  type: 'order' | 'sale';
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface OrderPayload {
  id: string;
  customer_name?: string | null;
  order_number?: string | null;
  total?: number | string | null;
  payment_currency?: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface SalePayload {
  id: string;
  seller_name?: string | null;
  product_name?: string | null;
  price?: number | string | null;
  currency?: string | null;
  created_at: string;
  [key: string]: unknown;
}

const sharedRealtimeState = {
  channel: null as ReturnType<typeof supabase.channel> | null,
  subscribers: 0,
};

// Marca persistente de "hasta cuándo ya vio las notificaciones".
// Sin esto el contador volvía a N en cada recarga (el bug del "17 nuevos").
const LAST_SEEN_KEY = "neocharge:admin:notifications-seen-at";

function getLastSeen(): number {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    const t = raw ? Date.parse(raw) : NaN;
    return Number.isFinite(t) ? t : 0;
  } catch {
    return 0;
  }
}

function setLastSeen(when: Date = new Date()) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, when.toISOString());
  } catch {
    // almacenamiento no disponible: el contador se recalcula en memoria
  }
}

function unsubscribeSharedRealtimeChannel() {
  const channel = sharedRealtimeState.channel;
  if (!channel) return;

  channel.unsubscribe();
  void supabase.removeChannel(channel);
  sharedRealtimeState.channel = null;
  sharedRealtimeState.subscribers = 0;
}

export function useOrderNotifications(enabled: boolean = true) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  const seenRecordIdsRef = useRef<Set<string>>(new Set());
  // created_at más nuevo que ya conocemos: solo lo más nuevo que esto
  // dispara notificación. Evita el bug de notificar pedidos viejos
  // (la carga inicial traía 15 y el poll 25 -> los 10 viejos "revivían").
  const maxKnownTimeRef = useRef<number>(0);
  const lastSeenRef = useRef<number>(getLastSeen());
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Limpiar destellos de título al enfocar la pestaña
  useEffect(() => {
    const handleFocus = () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
        document.title = "Admin — NeoCharge";
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (enabled && typeof Notification !== "undefined" && Notification.permission === "default") {
      // Solicitar permisos de notificación proactivamente si el usuario tiene privilegios de admin
      // y aún no ha respondido a la solicitud de permisos.
      Notification.requestPermission().then(permission => {
        if (permission !== "granted") {
          console.warn("Permisos de notificación denegados.");
        }
        // "granted": no hace falta loguear nada, el flujo continúa normalmente.
      });
    }
  }, [enabled]);

  // Función para reproducir sonido usando Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContext) return; // Navegador no soporta AudioContext

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine"; // Puedes probar "square", "sawtooth", "triangle"
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // Frecuencia de 440 Hz (La central)
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05); // Ataque rápido
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5); // Caída

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5); // Duración total del sonido
    } catch (error) {
      console.warn("Error reproduciendo sonido de notificación:", error);
    }
  }, []);

  const pushNotification = useCallback((payload: OrderPayload | SalePayload, type: 'order' | 'sale') => {
    const id = payload.id;
    if (!id || seenRecordIdsRef.current.has(id)) return;

    seenRecordIdsRef.current.add(id);

    const order = type === 'order' ? (payload as OrderPayload) : null;
    const sale = type === 'sale' ? (payload as SalePayload) : null;
    const notif: AdminNotification = {
      id,
      type,
      title: type === 'order' ? '🎉 Nuevo pedido!' : '📈 Nueva venta registrada',
      subtitle: order
        ? `${order.customer_name} - Orden #${order.order_number}`
        : `${sale?.seller_name || 'Gestor'} - ${sale?.product_name || 'Venta nueva'}`,
      amount: order ? Number(order.total ?? 0) : Number(sale?.price ?? 0),
      currency: (order?.payment_currency ?? sale?.currency ?? 'USD') as string,
      created_at: payload.created_at,
      metadata: payload,
    };

    setNotifications((prev) => [notif, ...prev].slice(0, 40));
    setUnreadCount((prev) => prev + 1);

    playNotificationSound();

    // Iniciar parpadeo del título de la pestaña si está en segundo plano
    if (document.hidden) {
      if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
      let showAltTitle = true;
      flashIntervalRef.current = setInterval(() => {
        document.title = showAltTitle 
          ? `🔴 ¡NUEVO PEDIDO!` 
          : `🎉 Orden #${payload.order_number || 'Nueva'}`;
        showAltTitle = !showAltTitle;
      }, 1000);
    }

    toast({
      title: notif.title,
      description: notif.subtitle,
      duration: 10000,
    });

    const formattedAmount = formatMoney(notif.amount, notif.currency);
    void showBrowserNotification(notif.title, {
      body: `${notif.subtitle}\n${formattedAmount}`,
      icon: '/images/logo.png',
      tag: `${type}-${id}`,
    });
  }, [toast, playNotificationSound]);

  // Cargar notificaciones previas: NUNCA dispara avisos, solo puebla la lista
  // y calcula cuántas son realmente nuevas (más nuevas que la última vez
  // que Mel las marcó como vistas).
  const loadRecentNotifications = useCallback(async () => {
    try {
      const [{ data: orderData, error: orderError }, { data: saleData, error: saleError }] = await Promise.all([
        supabase
          .from('orders')
          .select('id,order_number,customer_name,total,total_cup,payment_currency,items,created_at,status')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('seller_sales')
          .select('id,seller_name,product_name,price,currency,created_at')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      if (orderError) throw orderError;
      if (saleError) throw saleError;

      const orderNotifs: AdminNotification[] = (orderData || []).map((order: OrderPayload) => ({
        id: order.id,
        type: 'order',
        title: '🎉 Nuevo pedido!',
        subtitle: `${order.customer_name} - Orden #${order.order_number}`,
        amount: Number(order.total ?? 0),
        currency: order.payment_currency,
        created_at: order.created_at,
        metadata: order,
      }));

      const saleNotifs: AdminNotification[] = (saleData || []).map((sale: SalePayload) => ({
        id: sale.id,
        type: 'sale',
        title: '📈 Nueva venta registrada',
        subtitle: `${sale.seller_name || 'Gestor'} - ${sale.product_name ?? 'Venta'}`,
        amount: Number(sale.price ?? 0),
        currency: sale.currency,
        created_at: sale.created_at,
        metadata: sale,
      }));

      const allNotifs = [...orderNotifs, ...saleNotifs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(allNotifs);
      seenRecordIdsRef.current = new Set(allNotifs.map((notif) => notif.id));
      maxKnownTimeRef.current = allNotifs.reduce(
        (m, n) => Math.max(m, new Date(n.created_at).getTime() || 0),
        0,
      );

      // Primera vez en este navegador: arrancar el "visto" en ahora para no
      // contar el historial viejo como nuevo.
      if (!lastSeenRef.current) {
        lastSeenRef.current = Date.now();
        setLastSeen();
        setUnreadCount(0);
      } else {
        setUnreadCount(allNotifs.filter((n) => new Date(n.created_at).getTime() > lastSeenRef.current).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  // Entrada única para registros que llegan por poll o realtime:
  // solo avisa si es REALMENTE nuevo (más nuevo que todo lo conocido).
  const handleIncomingRecord = useCallback((payload: OrderPayload | SalePayload, type: 'order' | 'sale') => {
    if (isGenuinelyNew(payload.created_at, maxKnownTimeRef.current)) {
      maxKnownTimeRef.current = new Date(payload.created_at).getTime();
      pushNotification(payload, type);
    } else {
      // Viejo o ya visto: solo registrar el id para no re-evaluarlo.
      if (payload.id) seenRecordIdsRef.current.add(payload.id);
    }
  }, [pushNotification]);

  // Configurar escucha en tiempo real
  useEffect(() => {
    if (!enabled) {
      if (sharedRealtimeState.subscribers > 0) {
        sharedRealtimeState.subscribers -= 1;
      }

      if (sharedRealtimeState.subscribers <= 0) {
        unsubscribeSharedRealtimeChannel();
      }
      return;
    }

    // La carga inicial DEBE terminar antes de arrancar el poll/realtime:
    // si no, el primer poll corre con maxKnownTime=0 y notifica todo
    // (hasta 50 avisos de una vez en conexiones lentas).
    let cancelled = false;
    let intervalId = 0;
    const loadedRef = { current: false };

    const pollForNewRecords = async () => {
      if (!loadedRef.current || cancelled) return;
      try {
        const [{ data: orderData, error: orderError }, { data: saleData, error: saleError }] = await Promise.all([
          supabase
            .from('orders')
            .select('id,order_number,customer_name,total,total_cup,payment_currency,items,created_at,status')
            .order('created_at', { ascending: false })
            .limit(25),
          supabase
            .from('seller_sales')
            .select('id,seller_name,product_name,price,currency,created_at')
            .order('created_at', { ascending: false })
            .limit(25),
        ]);

        if (orderError) throw orderError;
        if (saleError) throw saleError;

        const unseenOrders = getUnseenRecords(seenRecordIdsRef.current, orderData || []);
        unseenOrders.forEach((order: OrderPayload) => {
          if (!order.id) return;
          handleIncomingRecord(order, 'order');
        });

        const unseenSales = getUnseenRecords(seenRecordIdsRef.current, saleData || []);
        unseenSales.forEach((sale: SalePayload) => {
          if (!sale.id) return;
          handleIncomingRecord(sale, 'sale');
        });
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    };

    const startListening = async () => {
      await loadRecentNotifications();
      if (cancelled) return;
      loadedRef.current = true;

      intervalId = window.setInterval(() => {
        void pollForNewRecords();
      }, 10000);

      const channel = sharedRealtimeState.channel ?? supabase
        .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new as unknown as OrderPayload;
          if (newOrder?.id) {
            handleIncomingRecord(newOrder, 'order');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seller_sales',
        },
        (payload) => {
          const newSale = payload.new as unknown as SalePayload;
          if (newSale?.id) {
            handleIncomingRecord(newSale, 'sale');
          }
        }
      );

    sharedRealtimeState.channel = channel;
    sharedRealtimeState.subscribers += 1;

      if (!channel.state || channel.state === 'closed') {
        channel.subscribe((status, err) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            setIsListening(true);
          } else {
            setIsListening(false);
          }
          if (err) {
            console.error('Realtime order subscription error:', err);
          }
        });
      }
    };

    void startListening();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);

      sharedRealtimeState.subscribers = Math.max(0, sharedRealtimeState.subscribers - 1);

      if (sharedRealtimeState.subscribers === 0) {
        unsubscribeSharedRealtimeChannel();
      }
    };
  }, [enabled, loadRecentNotifications, handleIncomingRecord]);

  // Pedir permisos para notificaciones
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Marcar todo como visto: persiste la marca para que el contador
  // no vuelva a subir en la próxima visita. También apaga el parpadeo
  // del título (en móvil el evento focus puede no dispararse).
  const markAllAsRead = useCallback(() => {
    lastSeenRef.current = Date.now();
    setLastSeen();
    setUnreadCount(0);
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
      document.title = "Admin — NeoCharge";
    }
  }, []);

  // Limpiar notificaciones leídas (solo memoria)
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isListening,
    clearNotifications,
    markAllAsRead,
    requestNotificationPermission,
  };
}

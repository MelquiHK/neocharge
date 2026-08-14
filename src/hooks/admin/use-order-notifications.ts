import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { showBrowserNotification } from '@/lib/notifications';
import { getUnseenRecords } from '@/hooks/admin/order-notifications.utils';

interface AdminNotification {
  id: string;
  type: 'order' | 'sale';
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  created_at: string;
  metadata: Record<string, any>;
}

export function useOrderNotifications(enabled: boolean = true) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  const seenRecordIdsRef = useRef<Set<string>>(new Set());
  const flashIntervalRef = useRef<any>(null);

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
        if (permission === "granted") {
          console.log("Permisos de notificación concedidos.");
        } else {
          console.warn("Permisos de notificación denegados.");
        }
      });
    }
  }, [enabled]);

  const pushNotification = useCallback((payload: any, type: 'order' | 'sale') => {
    const id = payload.id;
    if (!id || seenRecordIdsRef.current.has(id)) return;

    seenRecordIdsRef.current.add(id);

    const notif: AdminNotification = {
      id,
      type,
      title: type === 'order' ? '🎉 Nuevo pedido!' : '📈 Nueva venta registrada',
      subtitle: type === 'order'
        ? `${payload.customer_name} - Orden #${payload.order_number}`
        : `${payload.seller_name || 'Gestor'} - ${payload.product_name || 'Venta nueva'}`,
      amount: type === 'order' ? Number(payload.total ?? 0) : Number(payload.price ?? 0),
      currency: type === 'order' ? payload.payment_currency : payload.currency,
      created_at: payload.created_at,
      metadata: payload,
    };

    setNotifications((prev) => [notif, ...prev]);
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

    const formattedAmount = notif.currency === 'USD' ? `$ ${notif.amount}` : `₱ ${notif.amount}`;
    void showBrowserNotification(notif.title, {
      body: `${notif.subtitle}\n${formattedAmount}`,
      icon: '/images/logo.png',
      tag: `${type}-${id}`,
    });
  }, [toast]);

  // Cargar notificaciones previas no leídas
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

      const orderNotifs: AdminNotification[] = (orderData || []).map((order: any) => ({
        id: order.id,
        type: 'order',
        title: '🎉 Nuevo pedido!',
        subtitle: `${order.customer_name} - Orden #${order.order_number}`,
        amount: Number(order.total ?? 0),
        currency: order.payment_currency,
        created_at: order.created_at,
        metadata: order,
      }));

      const saleNotifs: AdminNotification[] = (saleData || []).map((sale: any) => ({
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
      setUnreadCount(allNotifs.length);
      seenRecordIdsRef.current = new Set(allNotifs.map((notif) => notif.id));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  // Configurar escucha en tiempo real
  useEffect(() => {
    if (!enabled) return;

    loadRecentNotifications();

    const pollForNewRecords = async () => {
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
        unseenOrders.forEach((order: any) => {
          if (!order.id) return;
          pushNotification(order, 'order');
        });

        const unseenSales = getUnseenRecords(seenRecordIdsRef.current, saleData || []);
        unseenSales.forEach((sale: any) => {
          if (!sale.id) return;
          pushNotification(sale, 'sale');
        });
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    };

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          const newOrder = payload.new;
          if (newOrder?.id) {
            pushNotification(newOrder, 'order');
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
        (payload: any) => {
          const newSale = payload.new;
          if (newSale?.id) {
            pushNotification(newSale, 'sale');
          }
        }
      );

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        setIsListening(true);
      } else {
        setIsListening(false);
      }
      if (err) {
        console.error('Realtime order subscription error:', err);
      }
    });

    const intervalId = window.setInterval(() => {
      void pollForNewRecords();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
      channel.unsubscribe();
      supabase.removeChannel(channel).catch(() => {
        // Ignore cleanup errors
      });
    };
  }, [enabled, loadRecentNotifications, pushNotification]);

  // Función para reproducir sonido usando Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
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
  // Pedir permisos para notificaciones
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Limpiar notificaciones leídas
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isListening,
    clearNotifications,
    requestNotificationPermission,
  };
}

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { showBrowserNotification } from '@/lib/notifications';
import { getUnseenOrders } from '@/hooks/admin/order-notifications.utils';

interface OrderNotification {
  id: string;
  order_number: number;
  customer_name: string;
  total: number;
  total_cup: number;
  payment_currency: string;
  items_count: number;
  created_at: string;
}

export function useOrderNotifications(enabled: boolean = true) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  const seenOrderIdsRef = useRef<Set<string>>(new Set());

  const pushNotification = useCallback((order: any) => {
    const id = order.id;
    if (!id || seenOrderIdsRef.current.has(id)) return;

    seenOrderIdsRef.current.add(id);

    const notif: OrderNotification = {
      id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      total: order.total,
      total_cup: order.total_cup,
      payment_currency: order.payment_currency,
      items_count: Array.isArray(order.items) ? order.items.length : 0,
      created_at: order.created_at,
    };

    setNotifications((prev) => [notif, ...prev]);
    setUnreadCount((prev) => prev + 1);

    playNotificationSound();

    toast({
      title: '🎉 Nuevo pedido!',
      description: `${order.customer_name} - Orden #${order.order_number}`,
      duration: 10000,
    });

    void showBrowserNotification('🎉 Nuevo pedido en NeoCharge!', {
      body: `${order.customer_name} - Orden #${order.order_number}\n${order.payment_currency === 'USD' ? '$' : '₱'} ${order.payment_currency === 'USD' ? order.total : order.total_cup}`,
      icon: '/images/logo.png',
      tag: `order-${id}`,
    });
  }, [toast]);

  // Cargar notificaciones previas no leídas
  const loadUnreadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,customer_name,total,total_cup,payment_currency,items,created_at,status')
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      const notifs: OrderNotification[] = (data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        total: order.total,
        total_cup: order.total_cup,
        payment_currency: order.payment_currency,
        items_count: Array.isArray(order.items) ? order.items.length : 0,
        created_at: order.created_at,
      }));

      setNotifications(notifs);
      setUnreadCount(notifs.length);
      seenOrderIdsRef.current = new Set(notifs.map((notif) => notif.id));
    } catch (error) {
      console.error('Error loading unread orders:', error);
    }
  }, []);

  // Configurar escucha en tiempo real
  useEffect(() => {
    if (!enabled) return;

    loadUnreadOrders();

    const pollForNewOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id,order_number,customer_name,total,total_cup,payment_currency,items,created_at,status')
          .order('created_at', { ascending: false })
          .limit(25);

        if (error) throw error;

        const unseenOrders = getUnseenOrders(seenOrderIdsRef.current, data || []);
        unseenOrders.forEach((order: any) => {
          if (!order.id) return;
          pushNotification(order);
        });
      } catch (error) {
        console.error('Error polling orders:', error);
      }
    };

    const channel = supabase
      .channel('orders')
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
            pushNotification(newOrder);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          const updatedOrder = payload.new;
          if (updatedOrder?.id) {
            pushNotification(updatedOrder);
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
      void pollForNewOrders();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
      channel.unsubscribe();
      supabase.removeChannel(channel).catch(() => {
        // Ignore cleanup errors
      });
    };
  }, [enabled, loadUnreadOrders, pushNotification]);

  // Función para reproducir sonido
  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      audio.play().catch(() => {
        // Silenciosamente fallar si el audio no se puede reproducir
      });
    } catch (error) {
      // Ignorar errores
    }
  };

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

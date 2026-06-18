import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Cargar notificaciones previas no leídas
  const loadUnreadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,customer_name,total,total_cup,payment_currency,items,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

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
    } catch (error) {
      console.error('Error loading unread orders:', error);
    }
  }, []);

  // Configurar escucha en tiempo real
  useEffect(() => {
    if (!enabled) return;

    loadUnreadOrders();

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
          const notif: OrderNotification = {
            id: newOrder.id,
            order_number: newOrder.order_number,
            customer_name: newOrder.customer_name,
            total: newOrder.total,
            total_cup: newOrder.total_cup,
            payment_currency: newOrder.payment_currency,
            items_count: Array.isArray(newOrder.items) ? newOrder.items.length : 0,
            created_at: newOrder.created_at,
          };

          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          playNotificationSound();

          toast({
            title: '🎉 Nuevo pedido!',
            description: `${newOrder.customer_name} - Orden #${newOrder.order_number}`,
            duration: 10000,
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🎉 Nuevo pedido en NeoCharge!', {
              body: `${newOrder.customer_name} - Orden #${newOrder.order_number}\n${newOrder.payment_currency === 'USD' ? '$' : '₱'} ${newOrder.payment_currency === 'USD' ? newOrder.total : newOrder.total_cup}`,
              icon: '/images/logo.png',
              tag: `order-${newOrder.id}`,
            });
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

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel).catch(() => {
        // Ignore cleanup errors
      });
    };
  }, [enabled, loadUnreadOrders, toast]);

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

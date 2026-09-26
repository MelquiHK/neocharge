import { useEffect, useState } from 'react';
import { useOrderNotifications } from '@/hooks/admin/use-order-notifications';
import { Button } from '@/components/ui/button';
import { Bell, Volume2, CheckCircle2 } from 'lucide-react';
import { AdminEmptyState, StatusBadge } from './ui';

interface OrderNotificationsWidgetProps {
  inline?: boolean;
}

export function OrderNotificationsWidget({ inline }: OrderNotificationsWidgetProps) {
  const { notifications, unreadCount, isListening, clearNotifications, requestNotificationPermission } =
    useOrderNotifications(true);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }

    setPermissionState(Notification.permission);
    setNotificationEnabled(Notification.permission === 'granted');
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationEnabled(true);
      setPermissionState('granted');
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionState(permission);
    setNotificationEnabled(permission === 'granted');
    requestNotificationPermission();
  };

  const wrapperClasses = inline
    ? "rounded-3xl border border-border/60 bg-card p-4 shadow-soft"
    : "fixed bottom-4 right-4 z-50";

  const content = (
    <div className={wrapperClasses}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Notificaciones</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Pedidos y ventas nuevas en tiempo real.</p>
          </div>
        </div>
        <StatusBadge tone={unreadCount > 0 ? "danger" : "neutral"}>
          {unreadCount} {unreadCount === 1 ? "nuevo" : "nuevos"}
        </StatusBadge>
      </div>

      {!isListening && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-border/70 bg-muted/40 p-3 text-sm">
          <p className="font-medium">Conectando con notificaciones en tiempo real…</p>
          <p className="mt-1 text-muted-foreground">Si no llega la notificación, revisa que tu conexión sea estable y que el servicio de Supabase esté activo.</p>
        </div>
      )}

      <div className="mt-4">
        {notifications.length === 0 ? (
          <AdminEmptyState icon={Bell} title="No hay notificaciones nuevas." className="py-8" />
        ) : (
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="hover-lift rounded-3xl border border-border/60 bg-card p-3 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{notif.title}</p>
                    <p className="text-sm text-muted-foreground">{notif.subtitle}</p>
                  </div>
                  <StatusBadge tone="success">Nuevo</StatusBadge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{notif.type === 'order' ? 'Pedido' : 'Venta'}</span>
                  <span className="font-semibold text-foreground">
                    {notif.currency === 'USD' ? '$' : '₱'}{notif.amount.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(notif.created_at).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!notificationEnabled && (
          <Button size="sm" variant="outline" onClick={() => { void handleEnableNotifications(); }} className="min-h-9 flex-1 min-w-[140px]">
            {permissionState === 'denied' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {permissionState === 'denied' ? 'Reintentar permisos' : 'Habilitar notificaciones'}
          </Button>
        )}
        {notifications.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearNotifications} className="min-h-9 flex-1 min-w-[140px]">
            Limpiar todo
          </Button>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return <div className="fixed bottom-4 right-4 z-50">{content}</div>;
}

import { useEffect, useState } from 'react';
import { useOrderNotifications } from '@/hooks/admin/use-order-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Volume2, CheckCircle2 } from 'lucide-react';

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
    ? "rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90"
    : "fixed bottom-4 right-4 z-50";

  const content = (
    <div className={wrapperClasses}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Bell className="w-5 h-5 text-blue-600" />
            <span>Notificaciones</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pedidos y ventas nuevas en tiempo real.</p>
        </div>
        <Badge variant={unreadCount > 0 ? "destructive" : "secondary"} className="text-xs py-1 px-2">
          {unreadCount} {unreadCount === 1 ? "nuevo" : "nuevos"}
        </Badge>
      </div>
      {!isListening && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-100 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <p className="font-medium">Conectando con notificaciones en tiempo real...</p>
          <p className="mt-1">Si no llega la notificación, revisa que tu conexión sea estable y que el servicio de Supabase esté activo.</p>
        </div>
      )}

      <div className="mt-4">
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-100 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <p>No hay notificaciones nuevas.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{notif.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{notif.subtitle}</p>
                  </div>
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
                    Nuevo
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{notif.type === 'order' ? 'Pedido' : 'Venta'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {notif.currency === 'USD' ? '$' : '₱'}{notif.amount.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{new Date(notif.created_at).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!notificationEnabled && (
          <Button size="sm" variant="outline" onClick={() => { void handleEnableNotifications(); }} className="flex-1 min-w-[140px]">
            {permissionState === 'denied' ? <CheckCircle2 className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            {permissionState === 'denied' ? 'Reintentar permisos' : 'Habilitar notificaciones'}
          </Button>
        )}
        {notifications.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearNotifications} className="flex-1 min-w-[140px]">
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

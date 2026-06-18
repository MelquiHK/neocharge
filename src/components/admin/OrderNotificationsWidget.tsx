import { useEffect, useState } from 'react';
import { useOrderNotifications } from '@/hooks/admin/use-order-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrderNotificationsWidget() {
  const { notifications, unreadCount, isListening, clearNotifications, requestNotificationPermission } =
    useOrderNotifications(true);
  const [isOpen, setIsOpen] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  useEffect(() => {
    // Verificar si tenemos permiso para notificaciones
    if ('Notification' in window) {
      setNotificationEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = () => {
    requestNotificationPermission();
    setNotificationEnabled(true);
  };

  if (!isListening) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Botón flotante de notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          unreadCount > 0
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        )}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center p-0 text-xs font-bold"
          >
            {unreadCount}
          </Badge>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 bg-white rounded-lg shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <h3 className="font-semibold">Nuevos Pedidos</h3>
              {isListening && (
                <span className="text-xs bg-green-400 px-2 py-1 rounded-full text-green-900">
                  Conectado
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700 p-1 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay pedidos nuevos</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 hover:bg-gray-50 transition cursor-pointer border-l-4 border-l-green-500"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">Orden #{notif.order_number}</p>
                        <p className="text-sm text-gray-600">{notif.customer_name}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Nuevo
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {notif.items_count} {notif.items_count === 1 ? 'artículo' : 'artículos'}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {notif.payment_currency === 'USD' ? '$' : '₱'}
                        {notif.payment_currency === 'USD' ? notif.total : notif.total_cup}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notif.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200 flex gap-2">
            {!notificationEnabled && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnableNotifications}
                className="flex-1 text-xs flex items-center justify-center gap-2"
              >
                <Volume2 className="w-3 h-3" />
                Habilitar sonido
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearNotifications}
                className="flex-1 text-xs"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type NotificationOptions = {
  body?: string;
  icon?: string;
  tag?: string;
  onclick?: () => void;
  vibrate?: number[];
};

export async function showBrowserNotification(title: string, options: NotificationOptions = {}) {
  if (typeof window === "undefined") return null;
  if (typeof window.Notification === "undefined") return null;
  if (window.Notification.permission !== "granted") return null;

  const notificationOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon,
    tag: options.tag,
    vibrate: options.vibrate || [200, 100, 200], // Vibración por defecto
  };

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker?.ready) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const notification = await registration.showNotification(title, notificationOptions);
      // Service worker notifications don't return the Notification object directly for handling clicks.
      // Clicks are handled by the service worker's 'notificationclick' event.
      return notification; // This is actually 'undefined' in most implementations, but good to keep.
    } catch (error) {
      console.warn("Error mostrando notificación a través del Service Worker:", error);
      // Fallback to direct Notification if service worker fails or is not ready.
    }
  }

  // Fallback para navegadores sin Service Worker o si el Service Worker falló.
  try {
    const notification = new window.Notification(title, notificationOptions);
    if (options.onclick) {
      notification.onclick = options.onclick;
    }
    return notification;
  } catch (error) {
    console.error("Error mostrando notificación directa:", error);
    return null;
  }
}

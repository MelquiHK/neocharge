type NotificationOptions = {
  body?: string;
  icon?: string;
  tag?: string;
  onclick?: () => void;
};

export async function showBrowserNotification(title: string, options: NotificationOptions = {}) {
  if (typeof window === "undefined") return null;

  if (typeof window.Notification === "undefined") return null;

  if (window.Notification.permission !== "granted") return null;

  try {
    const notification = new window.Notification(title, options);
    if (options.onclick) {
      notification.onclick = options.onclick;
    }
    return notification;
  } catch (error) {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker?.ready) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body: options.body,
          icon: options.icon,
          tag: options.tag,
        });
      } catch {
        // Ignore service worker notification failures.
      }
    }
    return null;
  }
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { showBrowserNotification } from "./notifications";

describe("showBrowserNotification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the service worker notification API when it is available", async () => {
    const showNotification = vi.fn();

    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: class NotificationMock {
        constructor() {
          throw new Error("Illegal constructor");
        }
      },
    });

    Object.defineProperty(window.Notification, "permission", {
      configurable: true,
      value: "granted",
    });

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({ showNotification }),
      },
    });

    await showBrowserNotification("Hola", { body: "Cuerpo" });

    expect(showNotification).toHaveBeenCalledWith("Hola", expect.objectContaining({ body: "Cuerpo" }));
  });

  it("does not throw when the browser blocks direct Notification construction", async () => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: class NotificationMock {
        constructor() {
          throw new Error("Illegal constructor");
        }
      },
    });

    Object.defineProperty(window.Notification, "permission", {
      configurable: true,
      value: "granted",
    });

    await expect(showBrowserNotification("Hola")).resolves.toBeNull();
  });
});

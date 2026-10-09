import { useCallback, useEffect, useState } from "react";

/**
 * Modo ahorro de datos de NeoCharge.
 * - Persistido en localStorage ("nc-data-saver").
 * - Cuando está activo se marca `data-data-saver="1"` en <html> y el CSS
 *   (ver src/index.css) desactiva animaciones pesadas y marquees.
 * - Los componentes de imagen lo leen vía `useDataSaver()` para pedir
 *   variantes más livianas (ver responsive-image.ts).
 */

export const DATA_SAVER_KEY = "nc-data-saver";
export const DATA_SAVER_WIDTHS = [200, 400];

export function isDataSaverEnabled(): boolean {
  try {
    return window.localStorage.getItem(DATA_SAVER_KEY) === "1";
  } catch {
    return false;
  }
}

function applyToDocument(on: boolean) {
  try {
    if (on) {
      document.documentElement.dataset.dataSaver = "1";
    } else {
      delete document.documentElement.dataset.dataSaver;
    }
  } catch {
    /* documento no disponible */
  }
}

/** Aplica el valor guardado al <html>. Llamar una vez al arrancar la app. */
export function initDataSaver() {
  applyToDocument(isDataSaverEnabled());
}

export function setDataSaverEnabled(on: boolean) {
  try {
    window.localStorage.setItem(DATA_SAVER_KEY, on ? "1" : "0");
  } catch {
    /* sin almacenamiento, se aplica igual en esta sesión */
  }
  applyToDocument(on);
  // Avisa a otras pestañas / componentes suscritos.
  try {
    window.dispatchEvent(new CustomEvent("nc:data-saver", { detail: on }));
  } catch {
    /* noop */
  }
}

/** Hook reactivo para leer y cambiar el modo ahorro de datos. */
export function useDataSaver(): [boolean, (on: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => isDataSaverEnabled());

  useEffect(() => {
    const sync = () => setEnabled(isDataSaverEnabled());
    const onCustom = (e: Event) =>
      setEnabled((e as CustomEvent<boolean>).detail === true);
    window.addEventListener("storage", sync);
    window.addEventListener("nc:data-saver", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nc:data-saver", onCustom as EventListener);
    };
  }, []);

  const set = useCallback((on: boolean) => {
    setDataSaverEnabled(on);
    setEnabled(on);
  }, []);

  return [enabled, set];
}

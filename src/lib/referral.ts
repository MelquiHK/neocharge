// Programa de referidos para gestores (LOTE D, mejora 9).
// Los gestores comparten https://tienda-neocharge.vercel.app/?ref=CODIGO.
// El código válido se guarda en localStorage y viaja con el pedido
// (orders.ref_code) para atribuir la comisión.

import { getSupabase } from "@/integrations/supabase/lazy-client";

export const REF_STORAGE_KEY = "nc_ref";

/** Código de referido guardado en este navegador (o null). */
export function getStoredRefCode(): string | null {
  try {
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    const code = (raw ?? "").trim().toUpperCase();
    return code || null;
  } catch {
    return null;
  }
}

/** Limpia el referido guardado (se llama al confirmar el pedido). */
export function clearStoredRefCode(): void {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // almacenamiento no disponible: no es crítico
  }
}

/**
 * Lee ?ref=CODE de la URL una sola vez, valida que el código exista y esté
 * activo, y lo guarda en localStorage. Silencioso si el código no es válido.
 * Limpia el parámetro de la URL para no arrastrarlo en la navegación.
 */
export async function captureRefFromUrl(): Promise<void> {
  let code: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    code = (params.get("ref") ?? "").trim().toUpperCase() || null;
  } catch {
    return;
  }
  if (!code) return;

  // Si ya hay un referido guardado y es el mismo, no hay nada que hacer.
  if (getStoredRefCode() === code) {
    cleanRefParam();
    return;
  }

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (!error && data) {
      try {
        localStorage.setItem(REF_STORAGE_KEY, code);
      } catch {
        // sin almacenamiento no hay persistencia: se ignora
      }
    }
  } catch {
    // sin red o error: se ignora en silencio
  } finally {
    cleanRefParam();
  }
}

/** Valida de nuevo un código guardado (por si se desactivó después). */
export async function validateStoredRefCode(): Promise<string | null> {
  const code = getStoredRefCode();
  if (!code) return null;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (!error && data) return code;
  } catch {
    // ante la duda, no se bloquea el pedido: se atribuye igual
    return code;
  }
  return null;
}

function cleanRefParam(): void {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("ref")) {
      url.searchParams.delete("ref");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  } catch {
    // no crítico
  }
}

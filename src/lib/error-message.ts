/**
 * Extrae un mensaje legible de cualquier error lanzado por Supabase/fetch.
 * Los errores de PostgREST a veces llegan como objetos sin `message` en la
 * forma esperada; String(err) daría "[object Object]". Esto nunca devuelve eso.
 */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null) {
    const maybe = err as { message?: unknown; error_description?: unknown; details?: unknown; hint?: unknown };
    if (typeof maybe.message === "string" && maybe.message) return maybe.message;
    if (typeof maybe.error_description === "string" && maybe.error_description) return maybe.error_description;
    const parts = [maybe.details, maybe.hint].filter((p) => typeof p === "string" && p) as string[];
    if (parts.length > 0) return parts.join(" ");
    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}") return json;
    } catch {
      /* ignorar */
    }
  }
  if (typeof err === "string" && err) return err;
  return "Error desconocido";
}

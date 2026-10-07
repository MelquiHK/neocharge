import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let clientPromise: Promise<SupabaseClient<Database>> | null = null;

/**
 * Devuelve el cliente Supabase cargándolo bajo demanda.
 *
 * El módulo `./client` (y con él `@supabase/supabase-js`, ~200 KB min)
 * NO forma parte del bundle inicial: Vite lo emite como chunk asíncrono
 * que se descarga en paralelo después del primer paint. Los componentes de
 * la ruta inicial lo obtienen con `const supabase = await getSupabase();`
 * dentro de sus funciones async / efectos.
 *
 * El singleton se comparte con las importaciones estáticas de las rutas
 * lazy (admin, cuenta, etc.): es la misma instancia en toda la app.
 */
export function getSupabase(): Promise<SupabaseClient<Database>> {
  if (!clientPromise) {
    clientPromise = import("./client").then((m) => m.supabase);
  }
  return clientPromise;
}

/**
 * Proveedor de sincronización offline.
 *
 * Se monta una vez en el layout y se encarga de todo lo que la app hace
 * sola respecto a la conexión:
 * - Siembra el catálogo desde el paquete instalado (primera vez).
 * - Refresca el catálogo al abrir, cada hora y al recuperar la conexión.
 * - Envía los pedidos que se hicieron sin conexión cuando vuelve internet.
 *
 * Todo en segundo plano: nunca bloquea lo que el usuario está viendo.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { seedFromBundle } from "@/lib/offline-cache";
import { refreshCatalogData, SYNC_INTERVAL_MS } from "@/lib/offline/sync";
import {
  flushPendingOrders,
  countPendingOrders,
} from "@/lib/offline/pending-orders";
import { getSupabase } from "@/integrations/supabase/lazy-client";

async function sendOrderToSupabase(payload: Record<string, unknown>): Promise<void> {
  const supabase = await getSupabase();
  // La tabla es fija; el cast evita pelear con el tipado generado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as (t: string) => any)("orders").insert(payload);
  if (error) throw error;
}

export function OfflineSyncProvider() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    let intervalId: number | undefined;

    const boot = async () => {
      // 1) Semilla del paquete instalado (instantáneo, offline OK).
      await seedFromBundle();
      if (cancelled) return;
      // 2) Refresco inicial en segundo plano (solo si hay buena conexión).
      await refreshCatalogData();
      if (cancelled) return;
      // 3) Refresco periódico cada hora.
      intervalId = window.setInterval(() => {
        void refreshCatalogData();
      }, SYNC_INTERVAL_MS);
    };

    const onOnline = async () => {
      // Al recuperar la conexión: primero los pedidos pendientes...
      try {
        const pending = await countPendingOrders();
        if (pending > 0) {
          const result = await flushPendingOrders(sendOrderToSupabase);
          if (result.sent.length > 0) {
            toast.success(
              result.sent.length === 1
                ? "Conexión recuperada: tu pedido fue enviado."
                : `Conexión recuperada: ${result.sent.length} pedidos fueron enviados.`,
            );
          }
          if (result.failed.length > 0) {
            toast.warning("Algunos pedidos no se pudieron enviar todavía. Se reintentará.");
          }
        }
      } catch {
        /* se reintenta en la próxima reconexión */
      }
      // ...y después el catálogo fresco.
      const summary = await refreshCatalogData();
      if (!cancelled && summary.ok && summary.updatedKeys.length > 0) {
        toast.info("Datos actualizados.", { duration: 2500 });
      }
    };

    window.addEventListener("online", onOnline);
    void boot();

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return null;
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCUP } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SolicitudesPagoProps {
  userId: string;
}

interface PaymentRequestRow {
  id: string;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  notes?: string | null;
  admin_notes?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

function statusBadge(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
      return (
        <Badge className="bg-blue-100 text-blue-700 border border-blue-200">Aprobada</Badge>
      );
    case "paid":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">Pagada</Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700 border border-red-200">Rechazada</Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Pendiente</Badge>
      );
  }
}

function formatRequestDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SolicitudesPago({ userId }: SolicitudesPagoProps) {
  const [requests, setRequests] = useState<PaymentRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("id, amount, currency, status, notes, admin_notes, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests(
        (data ?? []).map((r) => ({
          ...(r as PaymentRequestRow),
          id: String((r as PaymentRequestRow).id),
        })),
      );
    } catch (error: unknown) {
      toast.error("No se pudieron cargar tus solicitudes de pago: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`payment-requests-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_requests",
          filter: `user_id=eq.${userId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, userId]);

  if (loading) {
    return (
      <div className="rounded-[2rem] glass border border-white/70 p-6 text-center text-sm text-slate-500">
        Cargando tus solicitudes…
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-[2rem] glass border border-white/70 p-8 text-center">
        <div className="text-4xl mb-3">💸</div>
        <p className="text-slate-900 font-semibold">No has pedido pagos todavía</p>
        <p className="text-sm text-slate-500 mt-1">
          Cuando solicites el pago de tus comisiones, aparecerá aquí su estado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const amount = Number(req.amount ?? 0);
        return (
          <article
            key={req.id}
            className="rounded-[2rem] glass border border-white/70 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">{formatCUP(amount)}</div>
                <p className="text-xs text-slate-400 mt-1">{formatRequestDate(req.created_at)}</p>
              </div>
              {statusBadge(req.status)}
            </div>
            {req.admin_notes && (
              <div className="mt-3 rounded-2xl bg-white/70 border border-white px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Nota del administrador: </span>
                {req.admin_notes}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default SolicitudesPago;

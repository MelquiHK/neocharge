import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, PackageSearch, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCubanPhone, formatCubanPhoneDisplay } from "@/lib/cuban-phone";
import { formatMoney } from "@/lib/format";
import {
  ORDER_TIMELINE_STEPS,
  orderStatusLabel,
  orderStatusStepIndex,
  shortOrderId,
} from "@/lib/order-status";
import { cn } from "@/lib/utils";
import { useSEO } from "@/hooks/use-seo";

interface TrackedOrder {
  id: string;
  created_at: string;
  status: string;
  total: number;
  total_cup: number | null;
  payment_currency: string;
  items: { name?: string; quantity?: number }[];
  customer_name: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  confirmed: "bg-brand-500/15 text-brand-700 border-brand-500/30",
  preparing: "bg-grape-500/15 text-grape-700 border-grape-500/30",
  shipped: " bg-brand-500/15  text-brand-700 border-brand-500/30",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function OrderTimeline({ status }: { status: string }) {
  const current = orderStatusStepIndex(status);
  return (
    <ol className="flex items-start mt-4" aria-label={`Estado: ${orderStatusLabel(status)}`}>
      {ORDER_TIMELINE_STEPS.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const upcoming = i > current;
        return (
          <li key={step} className={cn("flex-1 flex flex-col items-center relative", i === 0 && "items-start", i === ORDER_TIMELINE_STEPS.length - 1 && "items-end")}>
            {/* Línea conectora */}
            {i > 0 && (
              <span
                className={cn(
                  "absolute top-[11px] right-1/2 w-full h-0.5 -z-0",
                  done || isCurrent ? "bg-brand-500" : "bg-slate-200"
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all",
                done && "bg-brand-500 border-brand-500 text-white",
                isCurrent && "bg-brand-500 border-brand-500 text-white shadow-glow-brand animate-pulse",
                upcoming && "bg-white border-slate-300 text-transparent"
              )}
            >
              {(done || isCurrent) && <CheckCircle2 className="w-4 h-4" />}
            </span>
            <span
              className={cn(
                "mt-1.5 text-[11px] leading-tight text-center font-semibold",
                isCurrent ? "text-brand-700" : done ? "text-slate-700" : "text-slate-400"
              )}
            >
              {orderStatusLabel(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const TrackOrder = () => {
  useSEO("trackOrder");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [searchedPhone, setSearchedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizeCubanPhone(phone);
    if (!normalized) {
      setError("Escribe un número de móvil cubano válido (ej. 5XXXXXXXX).");
      setOrders(null);
      return;
    }
    setLoading(true);
    try {
      // Los invitados no tienen SELECT en orders por RLS: la RPC
      // SECURITY DEFINER solo devuelve los pedidos de ese teléfono.
      const { data, error: rpcError } = await supabase.rpc("track_orders_by_phone", {
        p_phone: normalized,
      });
      if (rpcError) throw rpcError;
      setOrders((data ?? []) as TrackedOrder[]);
      setSearchedPhone(normalized);
    } catch (err) {
      console.error("TrackOrder search error:", err);
      setError("No pudimos buscar tus pedidos. Intenta de nuevo.");
      setOrders(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-12 md:py-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
            Seguimiento
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight nc-title-gradient">
            Rastrear mi pedido
          </h1>
          <p className="text-lg text-muted-foreground font-light">
            Escribe el número de WhatsApp con el que hiciste el pedido y verás su estado.
          </p>
        </header>

        <form onSubmit={handleSearch} className="nc-card p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="track-phone">Número de WhatsApp</Label>
            <div className="flex gap-2">
              <Input
                id="track-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+53 5XXXXXXX"
                inputMode="tel"
                autoComplete="tel"
                className="flex-1"
              />
              <Button type="submit" disabled={loading} className="nc-btn-primary shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </Button>
            </div>
          </div>
          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600 font-semibold">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
        </form>

        {orders !== null && !loading && (
          <div className="space-y-5">
            {searchedPhone && (
              <p className="text-sm text-muted-foreground text-center">
                Pedidos del número <span className="font-bold text-foreground">{formatCubanPhoneDisplay(searchedPhone)}</span>
              </p>
            )}
            {orders.length === 0 ? (
              <div className="nc-card p-10 text-center space-y-3">
                <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="font-display text-xl font-bold">No encontramos pedidos con ese número</p>
                <p className="text-sm text-muted-foreground">
                  Revisa que sea el mismo número que usaste al comprar. Si el problema sigue,{" "}
                  <a
                    href="https://wa.me/5363180910"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-brand-600 hover:underline"
                  >
                    escríbenos por WhatsApp
                  </a>.
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const items = Array.isArray(order.items) ? order.items : [];
                const itemCount = items.reduce((acc, it) => acc + (it.quantity ?? 1), 0);
                return (
                  <article key={order.id} className="nc-card p-6 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-display text-lg font-bold">Pedido #{shortOrderId(order.id)}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                          STATUS_BADGE[order.status] ?? "bg-slate-500/15 text-slate-700 border-slate-500/30"
                        )}
                      >
                        {order.status === "cancelled" && <XCircle className="w-3.5 h-3.5" />}
                        {orderStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {itemCount} {itemCount === 1 ? "producto" : "productos"} ·{" "}
                      <span className="font-bold text-foreground">
                        {formatMoney(order.total, order.payment_currency)}
                      </span>
                    </p>
                    {order.status === "cancelled" ? (
                      <p className="text-sm text-red-600 font-semibold pt-2">
                        Este pedido fue cancelado. Escríbenos por WhatsApp si necesitas ayuda.
                      </p>
                    ) : (
                      <OrderTimeline status={order.status} />
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          ¿Acabas de comprar?{" "}
          <Link to="/tienda" className="font-bold text-brand-600 hover:underline">
            Volver a la tienda
          </Link>
        </p>
      </div>
    </div>
  );
};

export default TrackOrder;

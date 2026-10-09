import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Package, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { orderStatusLabel, shortOrderId } from "@/lib/order-status";
import { useSEO } from "@/hooks/use-seo";

const WHATSAPP_NUMBER = "5363180910";

interface ConfirmedOrderItem {
  name?: string;
  quantity?: number;
  price?: number;
  currency?: string;
  image?: string;
}

interface ConfirmedOrder {
  id: string;
  created_at: string;
  status: string;
  total: number;
  total_cup: number | null;
  payment_currency: string;
  items: ConfirmedOrderItem[];
  customer_name: string;
  delivery_method: string;
}

const OrderConfirmed = () => {
  useSEO("orderConfirmed");
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        setNotFound(true);
        return;
      }
      // Los invitados no tienen SELECT en orders por RLS: se lee por RPC pública.
      const { data, error } = await supabase
        .rpc("get_order_public", { p_order_id: id })
        .maybeSingle();
      if (error || !data) {
        console.error("OrderConfirmed load error:", error);
        setNotFound(true);
      } else {
        setOrder(data as ConfirmedOrder);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="container-page py-24 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando tu pedido…
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="container-page py-24">
        <div className="max-w-lg mx-auto nc-card p-10 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
          <h1 className="font-display text-2xl font-bold">No encontramos ese pedido</h1>
          <p className="text-muted-foreground">
            Revisa el enlace o escríbenos por WhatsApp y lo buscamos juntos.
          </p>
          <Link to="/tienda" className="nc-btn-primary inline-flex">
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  const shortId = shortOrderId(order.id);
  const totalText = formatMoney(order.total, order.payment_currency);
  const waText = `Hola NeoCharge, acabo de hacer el pedido ${shortId} por ${totalText}. Quiero coordinar la entrega.`;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="container-page py-12 md:py-20">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Tarjeta de confirmación */}
        <div className="nc-card p-8 md:p-12 text-center space-y-6">
          <div className="relative inline-flex">
            <span className="absolute inset-0 rounded-full bg-brand-500/20 blur-2xl animate-pulse-glow" />
            <CheckCircle2 className="relative w-20 h-20 text-brand-600 animate-check-pop" strokeWidth={1.75} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
              Pedido recibido
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight nc-title-gradient">
              ¡Gracias, {order.customer_name.split(" ")[0]}!
            </h1>
            <p className="text-lg text-muted-foreground">
              Tu pedido <span className="font-bold text-foreground">#{shortId}</span> quedó registrado
              como <span className="font-semibold text-foreground">{orderStatusLabel(order.status)}</span>.
            </p>
          </div>

          {/* Resumen de items */}
          <div className="text-left rounded-2xl border border-border/60 bg-white/60 p-5 space-y-3">
            <h2 className="font-display font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-600" /> Resumen del pedido
            </h2>
            <ul className="divide-y divide-border/50">
              {items.map((item, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name ?? "Producto"}
                      className="w-12 h-12 rounded-xl object-cover border border-border/60"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-brand-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.name ?? "Producto"}</p>
                    <p className="text-sm text-muted-foreground">Cantidad: {item.quantity ?? 1}</p>
                  </div>
                  {typeof item.price === "number" && (
                    <p className="font-bold">{formatMoney(item.price * (item.quantity ?? 1), item.currency ?? order.payment_currency)}</p>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="w-4 h-4" />
                {order.delivery_method === "pickup" ? "Recoger en local" : "Entrega a domicilio"}
              </span>
              <p className="font-display text-2xl font-extrabold nc-title-gradient">{totalText}</p>
            </div>
          </div>

          {/* CTA principal */}
          <div className="space-y-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nc-btn-primary w-full !py-4 !text-lg"
            >
              <MessageCircle className="w-6 h-6" /> Coordinar por WhatsApp
            </a>
            <p className="text-sm text-muted-foreground">
              Escríbenos para coordinar la entrega y el pago. Te respondemos lo antes posible.
            </p>
          </div>
        </div>

        {/* Enlace a rastreo */}
        <p className="text-center text-sm text-muted-foreground">
          ¿Quieres ver el estado de tu pedido más tarde?{" "}
          <Link to="/rastrear" className="font-bold text-brand-600 hover:underline">
            Rastréalo aquí
          </Link>{" "}
          con tu número de WhatsApp.
        </p>
      </div>
    </div>
  );
};

export default OrderConfirmed;

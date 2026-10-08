import type { SellerSale } from "@/lib/sales";
import { formatCUP, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface VentasHistorialProps {
  sales: SellerSale[];
}

function formatSaleDate(iso: string | null | undefined): string {
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

export function VentasHistorial({ sales }: VentasHistorialProps) {
  if (sales.length === 0) {
    return (
      <div className="rounded-[2rem] glass border border-white/70 p-8 text-center">
        <div className="text-4xl mb-3">🧾</div>
        <p className="text-slate-900 font-semibold">Aún no registras ventas</p>
        <p className="text-sm text-slate-500 mt-1">
          Cuando cierres tu primera venta, aparecerá aquí con su comisión y su estado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sales.map((sale) => {
        const price = Number(sale.price ?? 0);
        const currency = (sale.currency ?? "USD").toUpperCase();
        const commission = Number(sale.commission_amount ?? 0);
        const paid = Number(sale.commission_paid_amount ?? 0);
        const isPaid = sale.is_paid === true || paid >= commission;
        const isApproved = sale.is_approved === true;

        return (
          <article
            key={String(sale.id)}
            className="rounded-[2rem] glass border border-white/70 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">
                  {sale.product_name ?? "Producto"}
                </h3>
                <p className="text-sm text-slate-500">
                  {sale.customer_name ?? "Cliente sin nombre"}
                  {sale.customer_phone ? ` · ${sale.customer_phone}` : ""}
                </p>
                <p className="text-xs text-slate-400 mt-1">{formatSaleDate(sale.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-slate-900">
                  {currency === "CUP" ? formatCUP(price) : formatMoney(price, currency)}
                </div>
                <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                  {commission > 0 ? (
                    <Badge className="bg-brand-100 text-brand-700 border border-brand-200">
                      +{formatCUP(commission)}
                    </Badge>
                  ) : (
                    <Badge className="bg-grape-600 text-white border-0">markup</Badge>
                  )}
                  {isPaid ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Pagado
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                      Pendiente
                    </Badge>
                  )}
                  {isApproved ? (
                    <Badge className="bg-brand-100 text-brand-700 border border-brand-200">
                      Aprobado
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 border border-slate-200">
                      En revisión
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default VentasHistorial;

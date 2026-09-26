import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  DollarSign,
  HandCoins,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAdminSales } from "@/hooks/admin/use-admin-sales";
import { useCashbox } from "@/hooks/admin/use-cashbox";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { computeOwnerSalesSummary } from "@/lib/sales";
import { formatCUP, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  AdminCardTitle,
  AdminLoading,
  AdminSectionHeader,
  AdminStat,
} from "./ui";

const inputClass =
  "h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm font-medium outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

export function AdminCashbox() {
  const { isOwner } = useAuth();
  const { sales, loading: salesLoading } = useAdminSales();
  const { cashbox, loading: boxLoading, saving, save } = useCashbox();
  const { rate } = useExchangeRate();
  const rateValue = rate?.usd_to_cup ?? 0;

  const summary = computeOwnerSalesSummary(sales ?? [], rateValue);
  const hasRate = rateValue > 0;
  // Sin tasa no se puede convertir el USD: se muestra solo la parte en CUP.
  const ganancia = hasRate
    ? summary.totalCUP + summary.totalUSD * rateValue - summary.owedCUP
    : summary.totalCUP - summary.owedCUP;

  // Campos editables (solo dueño). Se inicializan una vez con la caja guardada.
  const [cashUsd, setCashUsd] = useState("0");
  const [cashCup, setCashCup] = useState("0");
  const [earnedUsd, setEarnedUsd] = useState("0");
  const [earnedCup, setEarnedCup] = useState("0");
  const [note, setNote] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!boxLoading && !initialized.current) {
      initialized.current = true;
      setCashUsd(String(cashbox.cash_usd));
      setCashCup(String(cashbox.cash_cup));
      setEarnedUsd(String(cashbox.earned_usd));
      setEarnedCup(String(cashbox.earned_cup));
      setNote(cashbox.note);
    }
  }, [boxLoading, cashbox]);

  if (salesLoading || boxLoading) {
    return <AdminLoading label="Cargando caja…" />;
  }

  const fillEstimate = () => {
    const g = String(Math.round(ganancia));
    setCashCup(g);
    setEarnedCup(g);
  };

  const handleSave = () => {
    void save({
      cash_usd: Number(cashUsd) || 0,
      cash_cup: Number(cashCup) || 0,
      earned_usd: Number(earnedUsd) || 0,
      earned_cup: Number(earnedCup) || 0,
      note: note.trim(),
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <AdminSectionHeader
        icon={Wallet}
        title="Caja del negocio"
        description="Controla el dinero en caja y lo ganado. Solo el dueño puede editarla."
      />

      <AdminCard>
        <AdminCardTitle icon={Calculator} title="Automático (desde ventas)" />
        {!hasRate && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Sin tasa USD: la ganancia estimada necesita la tasa del día. Se muestra
              solo la parte en CUP.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <AdminStat
            icon={DollarSign}
            label="Vendido USD"
            value={formatPrice(summary.totalUSD)}
            sub={`${summary.count} ventas registradas`}
            tone="blue"
          />
          <AdminStat
            icon={DollarSign}
            label="Vendido CUP"
            value={formatCUP(summary.totalCUP)}
            sub="Ventas en moneda nacional"
            tone="sky"
          />
          <AdminStat
            icon={HandCoins}
            label="Debido a gestores"
            value={formatCUP(summary.owedCUP)}
            sub="Comisiones o markups"
            tone="amber"
          />
          <AdminStat
            icon={CheckCircle2}
            label="Pagado"
            value={formatCUP(summary.paidCUP)}
            sub="Ya liquidado a gestores"
            tone="emerald"
          />
          <AdminStat
            icon={AlertTriangle}
            label="Pendiente"
            value={formatCUP(summary.pendingCUP)}
            sub="Por pagar a gestores"
            tone="rose"
          />
          <AdminStat
            icon={TrendingUp}
            label="Ganancia estimada"
            value={formatCUP(ganancia)}
            sub={hasRate ? "Vendido menos deuda con gestores" : "Estimación parcial en CUP"}
            tone="emerald"
          />
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardTitle
          icon={PiggyBank}
          title="Caja manual"
          action={
            cashbox.updated_at ? (
              <span className="text-xs text-muted-foreground">
                Actualizado: {new Date(cashbox.updated_at).toLocaleString("es-CU")}
              </span>
            ) : undefined
          }
        />

        {isOwner ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Caja USD
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={cashUsd}
                  onChange={(e) => setCashUsd(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Caja CUP
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={cashCup}
                  onChange={(e) => setCashCup(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ganado USD
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={earnedUsd}
                  onChange={(e) => setEarnedUsd(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ganado CUP
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={earnedCup}
                  onChange={(e) => setEarnedCup(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nota
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Anota cualquier detalle sobre la caja…"
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={fillEstimate}
                disabled={saving}
                className="min-h-11"
              >
                Usar ganancia estimada
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-h-11"
              >
                {saving ? "Guardando…" : "Guardar caja"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <AdminStat
                icon={Wallet}
                label="Caja USD"
                value={formatPrice(cashbox.cash_usd)}
                tone="blue"
              />
              <AdminStat
                icon={Wallet}
                label="Caja CUP"
                value={formatCUP(cashbox.cash_cup)}
                tone="sky"
              />
              <AdminStat
                icon={TrendingUp}
                label="Ganado USD"
                value={formatPrice(cashbox.earned_usd)}
                tone="emerald"
              />
              <AdminStat
                icon={TrendingUp}
                label="Ganado CUP"
                value={formatCUP(cashbox.earned_cup)}
                tone="emerald"
              />
            </div>
            {cashbox.note && (
              <p className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                {cashbox.note}
              </p>
            )}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

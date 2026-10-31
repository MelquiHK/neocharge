import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshExchangeRate } from "@/hooks/use-exchange-rate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TrendingUp, Calendar, History } from "lucide-react";
import {
  AdminCard,
  AdminSectionHeader,
  AdminCardTitle,
  AdminStat,
  AdminEmptyState,
  StatusBadge,
  AdminTable,
  AdminTableHead,
  adminTh,
  adminTd,
  adminTr,
  AdminLoading,
} from "./ui";
import { DollarTrend } from "./DollarTrend";

interface Rate {
  id: string;
  rate_date: string;
  usd_to_cup: number;
  extra_cup_chargers: number;
  eur_to_cup?: number | null;
  notes: string | null;
}

export function AdminRates() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [todayRate, setTodayRate] = useState<string>("");
  const [todayEur, setTodayEur] = useState<string>("");
  const [extra, setExtra] = useState<string>("10");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("exchange_rates").select("*").order("rate_date", { ascending: false }).limit(90);
    setRates((data ?? []) as Rate[]);
    let eurFromRow = 0;
    if (data && data.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const todays = data.find((r: Rate) => r.rate_date === today);
      if (todays) {
        setTodayRate(String(todays.usd_to_cup));
        setExtra(String(todays.extra_cup_chargers));
        setNotes(todays.notes ?? "");
        if (todays.eur_to_cup) { setTodayEur(String(todays.eur_to_cup)); eurFromRow = Number(todays.eur_to_cup); }
      } else {
        setTodayRate(String(data[0].usd_to_cup));
        setExtra(String(data[0].extra_cup_chargers));
        if (data[0].eur_to_cup) { setTodayEur(String(data[0].eur_to_cup)); eurFromRow = Number(data[0].eur_to_cup); }
      }
    }
    // Fallback EUR: si la columna eur_to_cup aún no existe en la BD, la
    // tasa EUR vive en site_settings ('eur_rate'), que es lo que lee la
    // tienda pública mientras tanto.
    if (!eurFromRow) {
      const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "eur_rate").maybeSingle();
      const v = (setting as { value?: { eur_to_cup?: unknown } } | null)?.value;
      const eur = Number(v?.eur_to_cup);
      if (Number.isFinite(eur) && eur > 0) setTodayEur(String(eur));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveToday = async () => {
    const rateNum = Number(todayRate);
    // La tasa debe ser > 0: con 0 o negativa el RPC de ventas no puede
    // calcular el margen del socio y el hold se pierde en silencio.
    if (!todayRate || isNaN(rateNum) || rateNum <= 0) { toast.error("La tasa debe ser un número mayor que 0"); return; }
    const eurNum = Number(todayEur);
    if (todayEur && (isNaN(eurNum) || eurNum <= 0)) { toast.error("La tasa EUR debe ser un número mayor que 0 (o déjala vacía)"); return; }
    const today = new Date().toISOString().split("T")[0];
    const basePayload = {
      rate_date: today,
      usd_to_cup: Number(todayRate),
      extra_cup_chargers: Number(extra) || 0,
      notes: notes.trim() || null,
    };
    // EUR junto a la USD en la misma fila. Si la columna eur_to_cup aún no
    // existe en la BD, el upsert falla: se reintenta sin EUR (la USD nunca
    // se bloquea por el EUR) y el EUR queda guardado en site_settings.
    let eurInColumn = false;
    if (todayEur) {
      const { error } = await supabase.from("exchange_rates").upsert({ ...basePayload, eur_to_cup: eurNum }, { onConflict: "rate_date" });
      if (!error) {
        eurInColumn = true;
      } else {
        const retry = await supabase.from("exchange_rates").upsert(basePayload, { onConflict: "rate_date" });
        if (retry.error) { toast.error(retry.error.message); return; }
      }
    } else {
      const { error } = await supabase.from("exchange_rates").upsert(basePayload, { onConflict: "rate_date" });
      if (error) { toast.error(error.message); return; }
    }
    // La tasa EUR también se guarda SIEMPRE en site_settings ('eur_rate'):
    // es el respaldo que lee la tienda si la columna no está disponible.
    if (todayEur) {
      const { error: settingsError } = await supabase.from("site_settings").upsert(
        { key: "eur_rate", value: { eur_to_cup: eurNum, rate_date: today, fuente: "elTOQUE" } },
        { onConflict: "key" },
      );
      if (settingsError) console.error("No se pudo guardar el respaldo EUR en site_settings:", settingsError.message);
    }
    refreshExchangeRate();
    toast.success(eurInColumn || !todayEur ? "Tasa de hoy actualizada ✓" : "Tasa USD actualizada ✓ · EUR guardado como respaldo (falta la columna eur_to_cup en la BD)");
    load();
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const current = rates.find((r) => r.rate_date === todayStr) ?? rates[0];
  const isToday = !!current && current.rate_date === todayStr;

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminSectionHeader
        icon={TrendingUp}
        title="Tasas USD y EUR"
        description="Actualiza las tasas de cambio USD/CUP y EUR/CUP de la tienda (elTOQUE)."
      />

      {loading ? (
        <AdminLoading label="Cargando tasas…" />
      ) : (
        <>
          <AdminCard className="space-y-5 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <AdminCardTitle
              icon={TrendingUp}
              title="Tasa de cambio de hoy"
              action={isToday ? <StatusBadge tone="success">Actualizada hoy</StatusBadge> : undefined}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>1 USD = ___ CUP</Label>
                <Input type="number" step="0.01" value={todayRate} onChange={(e) => setTodayRate(e.target.value)} className="h-14 text-2xl font-bold" placeholder="440" />
              </div>
              <div className="space-y-2">
                <Label>Extra CUP/USD para cargadores</Label>
                <Input type="number" step="0.01" value={extra} onChange={(e) => setExtra(e.target.value)} className="h-14 text-lg font-semibold" placeholder="10" />
                <p className="text-xs text-muted-foreground">Se suman a la tasa base para cargadores</p>
              </div>
              <div className="space-y-2">
                <Label>1 EUR = ___ CUP</Label>
                <Input type="number" step="0.01" value={todayEur} onChange={(e) => setTodayEur(e.target.value)} className="h-14 text-2xl font-bold" placeholder="960" />
                <p className="text-xs text-muted-foreground">Tasa elTOQUE del euro. Los clientes pueden pagar en euros en efectivo a este cambio, sin extra.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: subió por la mañana, esperando estabilización..." className="min-h-[60px]" />
            </div>

            <Button variant="hero" size="lg" onClick={saveToday} className="w-full h-12 text-base">
              Guardar tasa de hoy
            </Button>

            {current && (
              <div className="space-y-1 rounded-2xl border border-border/60 bg-muted/50 p-4 text-sm">
                <p className="font-bold">Vista previa:</p>
                <p>• Producto en USD: precio × {Number(todayRate || 0)} CUP</p>
                <p>• Cargador (USD → CUP): precio × {Number(todayRate || 0) + Number(extra || 0)} CUP</p>
                {Number(todayEur || 0) > 0 && (
                  <p>• Pago en euros: precio USD × {Number(todayRate || 0)} ÷ {Number(todayEur || 0)} EUR (sin extra)</p>
                )}
              </div>
            )}
          </AdminCard>

          {current && (
            <DollarTrend rates={rates} />
          )}

          {current && (
            <AdminStat
              icon={TrendingUp}
              label="Última tasa registrada"
              value={`1 USD = ${current.usd_to_cup} CUP${current.eur_to_cup ? ` · 1 EUR = ${current.eur_to_cup} CUP` : ""}`}
              sub={`${new Date(current.rate_date).toLocaleDateString("es-CU", { weekday: "long", day: "numeric", month: "long" })}${current.extra_cup_chargers ? ` · +${current.extra_cup_chargers} CUP cargadores` : ""}`}
              tone="emerald"
            />
          )}

          <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
            <div className="p-5 pb-4 sm:p-6 sm:pb-4">
              <AdminCardTitle icon={Calendar} title="Historial (90 días)" className="mb-0" />
            </div>
            {rates.length === 0 ? (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <AdminEmptyState
                  icon={History}
                  title="Sin historial de tasas"
                  description="Todavía no hay tasas registradas. Guarda la primera con el formulario de arriba."
                />
              </div>
            ) : (
              <AdminTable className="rounded-none border-0">
                <AdminTableHead>
                  <tr>
                    <th className={adminTh}>Fecha</th>
                    <th className={adminTh}>Tasa</th>
                    <th className={adminTh}>Tasa EUR</th>
                    <th className={adminTh}>Extra cargadores</th>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rates.map((r, i) => (
                    <tr key={r.id} className={adminTr}>
                      <td className={adminTd}>
                        <div className="flex flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2 font-bold">
                            {new Date(r.rate_date).toLocaleDateString("es-CU", { weekday: "short", day: "numeric", month: "short" })}
                            {i === 0 && <StatusBadge tone="success">Última</StatusBadge>}
                          </span>
                          {r.notes && <span className="text-xs text-muted-foreground">{r.notes}</span>}
                        </div>
                      </td>
                      <td className={adminTd}>
                        <span className="font-display text-base font-bold whitespace-nowrap">
                          1 USD = {r.usd_to_cup} CUP
                        </span>
                      </td>
                      <td className={adminTd}>
                        <span className="whitespace-nowrap text-muted-foreground">
                          {r.eur_to_cup ? `1 EUR = ${r.eur_to_cup} CUP` : "—"}
                        </span>
                      </td>
                      <td className={adminTd}>
                        <span className="whitespace-nowrap text-muted-foreground">+{r.extra_cup_chargers} CUP</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </section>
        </>
      )}
    </div>
  );
}

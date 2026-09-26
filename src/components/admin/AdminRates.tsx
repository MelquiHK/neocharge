import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface Rate {
  id: string;
  rate_date: string;
  usd_to_cup: number;
  extra_cup_chargers: number;
  notes: string | null;
}

export function AdminRates() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [todayRate, setTodayRate] = useState<string>("");
  const [extra, setExtra] = useState<string>("10");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("exchange_rates").select("*").order("rate_date", { ascending: false }).limit(30);
    setRates((data ?? []) as Rate[]);
    if (data && data.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const todays = data.find((r: Rate) => r.rate_date === today);
      if (todays) {
        setTodayRate(String(todays.usd_to_cup));
        setExtra(String(todays.extra_cup_chargers));
        setNotes(todays.notes ?? "");
      } else {
        setTodayRate(String(data[0].usd_to_cup));
        setExtra(String(data[0].extra_cup_chargers));
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveToday = async () => {
    if (!todayRate || isNaN(Number(todayRate))) { toast.error("Tasa inválida"); return; }
    const today = new Date().toISOString().split("T")[0];
    const payload = {
      rate_date: today,
      usd_to_cup: Number(todayRate),
      extra_cup_chargers: Number(extra) || 0,
      notes: notes.trim() || null,
    };
    const { error } = await supabase.from("exchange_rates").upsert(payload, { onConflict: "rate_date" });
    if (error) { toast.error(error.message); return; }
    toast.success("Tasa de hoy actualizada ✓");
    load();
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const current = rates.find((r) => r.rate_date === todayStr) ?? rates[0];
  const isToday = !!current && current.rate_date === todayStr;

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminSectionHeader
        icon={TrendingUp}
        title="Tasa USD"
        description="Actualiza la tasa de cambio USD/CUP de la tienda."
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
              </div>
            )}
          </AdminCard>

          {current && (
            <AdminStat
              icon={TrendingUp}
              label="Última tasa registrada"
              value={`1 USD = ${current.usd_to_cup} CUP`}
              sub={`${new Date(current.rate_date).toLocaleDateString("es-CU", { weekday: "long", day: "numeric", month: "long" })}${current.extra_cup_chargers ? ` · +${current.extra_cup_chargers} CUP cargadores` : ""}`}
              tone="emerald"
            />
          )}

          <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
            <div className="p-5 pb-4 sm:p-6 sm:pb-4">
              <AdminCardTitle icon={Calendar} title="Historial (30 días)" className="mb-0" />
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

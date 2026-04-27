import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TrendingUp, Calendar } from "lucide-react";

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

  const load = async () => {
    const { data } = await supabase.from("exchange_rates").select("*").order("rate_date", { ascending: false }).limit(30);
    setRates((data ?? []) as any);
    if (data && data.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const todays = data.find((r: any) => r.rate_date === today);
      if (todays) {
        setTodayRate(String(todays.usd_to_cup));
        setExtra(String(todays.extra_cup_chargers));
        setNotes(todays.notes ?? "");
      } else {
        setTodayRate(String(data[0].usd_to_cup));
        setExtra(String(data[0].extra_cup_chargers));
      }
    }
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

  const current = rates.find((r) => r.rate_date === new Date().toISOString().split("T")[0]) ?? rates[0];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card-elevated p-6 space-y-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Tasa de cambio de hoy</h2>
            <p className="text-xs text-muted-foreground">Define en cuánto está el USD para los productos en CUP</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>1 USD = ___ CUP</Label>
            <Input type="number" step="0.01" value={todayRate} onChange={(e) => setTodayRate(e.target.value)} className="text-2xl font-bold h-14" placeholder="440" />
          </div>
          <div className="space-y-2">
            <Label>Extra CUP/USD para cargadores</Label>
            <Input type="number" step="0.01" value={extra} onChange={(e) => setExtra(e.target.value)} className="h-14" placeholder="10" />
            <p className="text-xs text-muted-foreground">Se suman a la tasa base para cargadores</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notas (opcional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: subió por la mañana, esperando estabilización..." className="min-h-[60px]" />
        </div>

        <Button variant="hero" size="lg" onClick={saveToday} className="w-full">
          Guardar tasa de hoy
        </Button>

        {current && (
          <div className="rounded-xl bg-muted p-4 text-sm space-y-1">
            <p className="font-semibold">Vista previa:</p>
            <p>• Producto en USD: precio × {Number(todayRate || 0)} CUP</p>
            <p>• Cargador (USD → CUP): precio × {Number(todayRate || 0) + Number(extra || 0)} CUP</p>
          </div>
        )}
      </div>

      <div className="card-elevated p-5">
        <h3 className="font-display font-bold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Historial (30 días)</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {rates.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-xl p-3 text-sm">
              <div>
                <p className="font-semibold">{new Date(r.rate_date).toLocaleDateString("es-CU", { weekday: "short", day: "numeric", month: "short" })}</p>
                {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold">1 USD = {r.usd_to_cup} CUP</p>
                <p className="text-xs text-muted-foreground">+{r.extra_cup_chargers} cargadores</p>
              </div>
            </div>
          ))}
          {rates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin historial.</p>}
        </div>
      </div>
    </div>
  );
}

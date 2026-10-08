import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BatteryCharging, Check, Clock3, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchWithCache, CACHE_KEYS } from "@/lib/offline-cache";
import { useSEO } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import {
  estimateChargeHours,
  parseChargerSpecifications,
} from "@/lib/charger-specs";
import { Product } from "@/types";
import { cn } from "@/lib/utils";

interface ChargerRow {
  product: Product;
  voltage?: number;
  current?: number;
  inStock: boolean;
  recommended: boolean;
  hours?: number;
  ideal: boolean;
}

/** El cargador que casi siempre hay disponible y el que más cuida la batería. */
const PREFERRED_VOLTAGE = 72;
const PREFERRED_CURRENT = 5;
/** Rango ideal de horas de carga: la carga lenta cuida más la batería. */
const IDEAL_MIN_HOURS = 7;
const IDEAL_MAX_HOURS = 9;

const CompararCargadores = () => {
  useSEO("comparar");

  const [chargers, setChargers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [ahInput, setAhInput] = useState("");
  const [voltageFilter, setVoltageFilter] = useState<"all" | "48" | "72">("all");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await fetchWithCache("chargers_v1", () =>
          supabase
            .from("products")
            .select(
              "id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,category_id,description,specifications,currency,price_cup,extra_cup_per_usd,warranty_type"
            )
            .eq("is_active", true)
            .in("warranty_type", ["charger", "charger-1w"])
            .order("price", { ascending: true })
            .then(r => { if (r.error) throw r.error; return r.data; })
        );
        setChargers((data ?? []) as Product[]);
      } catch (e) {
        console.error("CompararCargadores load error:", e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const capacityAh = useMemo(() => {
    const n = Number(ahInput.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [ahInput]);

  const rows: ChargerRow[] = useMemo(() => {
    const parsed = chargers.map((product) => {
      const specs = parseChargerSpecifications(product.specifications, product.name);
      const inStock = Number(product.stock ?? 0) > 0;
      const hours =
        capacityAh !== undefined ? estimateChargeHours(capacityAh, specs.current) : undefined;
      return {
        product,
        voltage: specs.voltage,
        current: specs.current,
        inStock,
        recommended: false,
        hours,
        ideal:
          hours !== undefined && hours >= IDEAL_MIN_HOURS && hours <= IDEAL_MAX_HOURS,
      } as ChargerRow;
    });

    const filtered = parsed.filter((row) =>
      voltageFilter === "all" ? true : row.voltage === Number(voltageFilter)
    );

    filtered.sort((a, b) => {
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      const vDiff = (a.voltage ?? 999) - (b.voltage ?? 999);
      if (vDiff !== 0) return vDiff;
      return (a.current ?? 999) - (b.current ?? 999);
    });

    // Recomendado: el disponible que más se acerca al preferido (72V/5A en stock);
    // si ese no hay, el primero disponible.
    const preferred =
      filtered.find(
        (row) =>
          row.inStock &&
          row.voltage === PREFERRED_VOLTAGE &&
          row.current === PREFERRED_CURRENT
      ) ?? filtered.find((row) => row.inStock);
    if (preferred) preferred.recommended = true;

    // El recomendado siempre primero.
    filtered.sort((a, b) => Number(b.recommended) - Number(a.recommended));

    return filtered;
  }, [chargers, capacityAh, voltageFilter]);

  return (
    <div className="container-page py-12 sm:py-16 lg:py-24 w-full max-w-full overflow-x-clip">
      <header className="text-center space-y-4 mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-brand-800 text-xs font-bold uppercase tracking-widest">
          <BatteryCharging className="w-4 h-4" aria-hidden="true" />
          Cargadores NeoCharge
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight nc-title-gradient">
          Compara los cargadores
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
          Escribe los amperios-hora (Ah) de tu batería y mira cuánto tardaría en
          cargarla con cada cargador. Todos son para baterías de litio.
        </p>
      </header>

      <section className="nc-card p-6 sm:p-8 max-w-3xl mx-auto mb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="compare-ah">Capacidad de tu batería (Ah)</Label>
            <Input
              id="compare-ah"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder="Ej: 20"
              value={ahInput}
              onChange={(event) => setAhInput(event.target.value)}
              className="nc-input h-12"
            />
            <p className="text-xs text-muted-foreground">
              Está escrita en la etiqueta de tu batería.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Voltaje</Label>
            <div className="flex gap-2">
              {(
                [
                  { value: "all", label: "Todos" },
                  { value: "48", label: "48V" },
                  { value: "72", label: "72V" },
                ] as const
              ).map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={voltageFilter === option.value ? "default" : "outline"}
                  className="rounded-full flex-1"
                  onClick={() => setVoltageFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              El voltaje del cargador debe coincidir con el de tu batería.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="max-w-4xl mx-auto space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="nc-card p-6 animate-pulse">
              <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800 mt-3" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="nc-card p-8 max-w-2xl mx-auto text-center">
          <p className="font-semibold">No pudimos cargar los cargadores</p>
          <p className="text-sm text-muted-foreground mt-2">
            Revisa tu conexión e inténtalo de nuevo.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="nc-card p-8 max-w-2xl mx-auto text-center">
          <p className="font-semibold">No hay cargadores con ese voltaje</p>
          <p className="text-sm text-muted-foreground mt-2">
            Prueba con otro filtro de voltaje.
          </p>
        </div>
      ) : (
        <section className="max-w-4xl mx-auto">
          <div className="overflow-x-auto rounded-3xl glass border-white/70">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground border-b border-border/60">
                  <th className="px-5 py-4 font-semibold">Cargador</th>
                  <th className="px-4 py-4 font-semibold">Voltaje</th>
                  <th className="px-4 py-4 font-semibold">Corriente</th>
                  <th className="px-4 py-4 font-semibold">Precio</th>
                  <th className="px-5 py-4 font-semibold">Tiempo estimado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.product.id}
                    className={cn(
                      "border-b border-border/40 last:border-0 transition-colors",
                      row.recommended && "bg-brand-50/70 dark:bg-brand-950/20"
                    )}
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/producto/${row.product.slug}`}
                            className="font-semibold hover:text-primary hover:underline"
                          >
                            {row.product.name}
                          </Link>
                          {row.recommended && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 text-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                              <Check className="w-3 h-3" aria-hidden="true" />
                              Recomendado
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            row.inStock ? "text-green-600" : "text-destructive"
                          )}
                        >
                          {row.inStock
                            ? `En stock (${row.product.stock} disponibles)`
                            : "Agotado por ahora"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      {row.voltage ? `${row.voltage}V` : "—"}
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      {row.current ? `${row.current}A` : "—"}
                    </td>
                    <td className="px-4 py-4 font-semibold tabular-nums">
                      {formatMoney(Number(row.product.price), row.product.currency)}
                    </td>
                    <td className="px-5 py-4">
                      {row.hours !== undefined ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
                          <Clock3 className="w-4 h-4 text-brand-600" aria-hidden="true" />
                          ~{row.hours} h
                          {row.ideal && (
                            <span className="rounded-full glass border-brand-300/70 px-2 py-0.5 text-[11px] font-bold text-brand-800 uppercase tracking-wide">
                              Ideal
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Escribe los Ah arriba
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-3xl glass border-white/70 p-5 sm:p-6 flex gap-3">
            <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
              <p>
                <strong>Entre 7 y 9 horas es el tiempo ideal de carga.</strong>{" "}
                Mientras más se demora la carga, más cuida tu batería: la carga
                lenta alarga su vida útil.
              </p>
              <p className="text-muted-foreground">
                El tiempo estimado se calcula como Ah ÷ amperes + 15%. Te
                recomendamos el cargador que tenemos disponible — casi siempre
                es el de 72V/5A, que además es el que más cuida la batería.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/tienda">
                Ver la tienda <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CompararCargadores;

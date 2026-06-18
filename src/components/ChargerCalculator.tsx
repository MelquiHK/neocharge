import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Product } from "@/types";

interface ChargerCalculatorProps {
  productName: string;
  productSpecs?: string | null;
  availableChargers?: Product[];
}

interface ChargerSpecs {
  voltage?: number;
  current?: number;
  batteryTypes?: string[];
}

const parseNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return undefined;
  const cleaned = String(value)
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "")
    .trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseChargerSpecifications = (raw: string | null | undefined): ChargerSpecs => {
  const specs: ChargerSpecs = {};
  if (!raw) return specs;
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (/volt/i.test(line) || /v\b/.test(line)) {
      const voltageMatch = line.match(/(\d+(?:[.,]\d+)?)(?=\s*(?:v|volt))/i);
      if (voltageMatch) {
        specs.voltage = parseNumber(voltageMatch[1]);
      }
    }

    if (/(amp(?:er)?|a)\b/i.test(line) && !/ah\b/i.test(lower)) {
      const currentMatch = line.match(/(\d+(?:[.,]\d+)?)(?=\s*(?:a|amp))/i);
      if (currentMatch) {
        specs.current = parseNumber(currentMatch[1]);
      }
    }

    if (/lifepo4|li-fe|li fe|litio fosfato/i.test(lower)) {
      specs.batteryTypes = [...new Set([...(specs.batteryTypes ?? []), "LiFePO4"])];
    }
    if (/litio|li-ion|lithium/i.test(lower)) {
      specs.batteryTypes = [...new Set([...(specs.batteryTypes ?? []), "Li-ion"])];
    }
    if (/plomo|gel|lead-acid|acido/i.test(lower)) {
      specs.batteryTypes = [...new Set([...(specs.batteryTypes ?? []), "Plomo-ácido/Gel"])];
    }
  }

  return specs;
};

const getRecommendedCurrent = (capacityAh: number) => {
  const recommended = Math.max(2, Math.min(10, Math.round(capacityAh * 0.15)));
  return recommended;
};

const getBatteryTypeLabel = (type: string) => {
  if (type === "lifepo4") return "LiFePO4";
  if (type === "lead-acid") return "Plomo-ácido / Gel";
  if (type === "lithium") return "Litio";
  return "Desconocido";
};

const getChargerMatchScore = (
  chargerSpecs: ChargerSpecs,
  batteryType: string,
  batteryVoltage: number,
  recommendationCurrent: number
) => {
  let score = 0;
  if (chargerSpecs.voltage) {
    const diff = Math.abs(chargerSpecs.voltage - batteryVoltage);
    if (diff === 0) score += 40;
    else if (diff <= 1) score += 25;
    else score -= 10;
  } else {
    score += 5;
  }

  if (chargerSpecs.batteryTypes?.length) {
    if (
      batteryType === "lifepo4" && chargerSpecs.batteryTypes.includes("LiFePO4")
    ) {
      score += 30;
    } else if (
      batteryType === "lithium" && (chargerSpecs.batteryTypes.includes("Li-ion") || chargerSpecs.batteryTypes.includes("LiFePO4"))
    ) {
      score += 25;
    } else if (
      batteryType === "lead-acid" && chargerSpecs.batteryTypes.includes("Plomo-ácido/Gel")
    ) {
      score += 30;
    } else if (batteryType === "unknown") {
      score += 0;
    } else {
      score -= 10;
    }
  }

  if (chargerSpecs.current) {
    const diff = Math.abs(chargerSpecs.current - recommendationCurrent);
    const relative = diff / recommendationCurrent;
    if (relative <= 0.2) score += 25;
    else if (relative <= 0.5) score += 12;
    else score -= 5;

    if (chargerSpecs.current > recommendationCurrent * 2) score -= 8;
    if (chargerSpecs.current < recommendationCurrent * 0.5) score -= 5;
  }

  return score;
};

export function ChargerCalculator({ productName, productSpecs, availableChargers = [] }: ChargerCalculatorProps) {
  const [batteryVoltage, setBatteryVoltage] = useState(48);
  const [batteryCapacity, setBatteryCapacity] = useState(20);
  const [batteryType, setBatteryType] = useState("lead-acid");
  const [showResult, setShowResult] = useState(false);

  const specs = useMemo(() => parseChargerSpecifications(productSpecs), [productSpecs]);
  const chargerOptions = useMemo(() => availableChargers ?? [], [availableChargers]);

  const result = useMemo(() => {
    const voltage = parseNumber(batteryVoltage);
    const capacity = parseNumber(batteryCapacity);
    if (!voltage || !capacity) return null;

    const recommendationCurrent = getRecommendedCurrent(capacity);
    const userTypeLabel = getBatteryTypeLabel(batteryType);
    const batteryTypeWarnings: string[] = [];
    if (batteryType === "lifepo4") {
      batteryTypeWarnings.push(
        "Si tu batería es LiFePO4, confirma que el cargador sea compatible con ese tipo antes de comprar."
      );
    }
    if (batteryType === "lithium") {
      batteryTypeWarnings.push(
        "Si tu batería es de litio, elige un cargador que soporte baterías de litio o LiFePO4 para una carga segura."
      );
    }

    const comparisonChargers = chargerOptions.length
      ? chargerOptions
      : [{
          id: "fallback",
          name: productName,
          slug: "",
          price: 0,
          currency: "USD",
          price_cup: 0,
          extra_cup_per_usd: 0,
          warranty_type: "charger",
          specifications: productSpecs,
          images: [],
          main_image_index: 0,
        } as Product];

    const chargerResults = comparisonChargers.map((charger) => {
      const chargerSpecs = parseChargerSpecifications(charger.specifications);
      const score = getChargerMatchScore(chargerSpecs, batteryType, voltage, recommendationCurrent);
      const chargeHours = chargerSpecs.current ? Number((capacity / chargerSpecs.current).toFixed(1)) : undefined;
      return {
        charger,
        chargerSpecs,
        score,
        chargeHours,
      };
    });

    const bestChargerResult = chargerResults.reduce((best, current) => {
      return !best || current.score > best.score ? current : best;
    }, chargerResults[0]);

    const bestName = bestChargerResult?.charger.name ?? productName;
    const bestSpecs = bestChargerResult?.chargerSpecs;
    const bestChargeHours = bestChargerResult?.chargeHours;
    const bestVoltageText = bestSpecs?.voltage ? `${bestSpecs.voltage}V` : "el voltaje recomendado";
    const bestCurrentText = bestSpecs?.current ? `${bestSpecs.current}A` : "la corriente recomendada";
    const supportedTypesText = bestSpecs?.batteryTypes?.length
      ? bestSpecs.batteryTypes.join(" / ")
      : "Plomo-ácido, Gel o Litio según modelo";

    const compatibilityMessage = `La mejor opción del catálogo para tu batería es ${bestName}. ` +
      `Este cargador ofrece ${bestVoltageText} y ${bestCurrentText}, lo que lo hace ideal para tu batería de ${voltage}V y ${capacity}Ah. ` +
      `Estimamos que la recarga completa tomará alrededor de ${bestChargeHours ? `${bestChargeHours} horas` : "el tiempo esperado según la corriente del cargador"}. ` +
      `Es una recomendación segura para baterías ${userTypeLabel}, con un balance entre velocidad y cuidado para que tu batería se cargue bien y te dure más.`;

    return {
      voltage,
      capacity,
      recommendationCurrent,
      chargeHours: bestChargeHours,
      batteryTypeWarnings,
      bestCharger: bestChargerResult?.charger,
      compatibilityMessage,
      bestVoltageText,
      bestCurrentText,
      userTypeLabel,
      supportedTypesText,
      allChargers: comparisonChargers,
      compatible: true,
    };
  }, [batteryVoltage, batteryCapacity, batteryType, chargerOptions, productName, productSpecs]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowResult(true);
  };

  const currentDescription = specs.current
    ? `${specs.current}A` : "No disponible";
  const voltageDescription = specs.voltage
    ? `${specs.voltage}V` : "No disponible";

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-primary font-semibold">Calculadora de cargador</p>
          <h3 className="text-2xl font-bold">¿Te sirve este cargador para tu batería?</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Ingresa el voltaje y la capacidad de tu batería para ver si el cargador es compatible y cuánto tiempo tardará en cargar.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="battery-voltage">Voltaje de la batería (V)</Label>
            <Input
              id="battery-voltage"
              type="number"
              min={12}
              step={1}
              value={batteryVoltage}
              onChange={(event) => setBatteryVoltage(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="battery-capacity">Capacidad (Ah)</Label>
            <Input
              id="battery-capacity"
              type="number"
              min={1}
              step={1}
              value={batteryCapacity}
              onChange={(event) => setBatteryCapacity(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="battery-type">Tipo de batería</Label>
            <select
              id="battery-type"
              className={cn(
                "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "text-slate-900 dark:text-slate-100"
              )}
              value={batteryType}
              onChange={(event) => setBatteryType(event.target.value)}
            >
              <option value="unknown">Desconocido</option>
              <option value="lead-acid">Plomo-ácido / Gel</option>
              <option value="lifepo4">LiFePO4</option>
              <option value="lithium">Litio</option>
            </select>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Voltaje del cargador</p>
            <p className="text-lg font-semibold">{voltageDescription}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Corriente del cargador</p>
            <p className="text-lg font-semibold">{currentDescription}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" className="w-full sm:w-auto">
            Calcular compatibilidad
          </Button>
          <p className="text-sm text-muted-foreground">
            {productName} {specs.voltage ? `(${voltageDescription}, ${currentDescription})` : "(datos técnicos parciales)"}
          </p>
        </div>
      </form>

      {showResult && result && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-muted-foreground">Resultado</p>
          <h4 className="mt-3 text-lg font-semibold">{result.compatible ? "Compatible" : "No compatible"}</h4>
          <p className="mt-3 text-slate-700 dark:text-slate-300 whitespace-pre-line">{result.compatibilityMessage}</p>

          <div className="grid gap-3 mt-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Carga estimada</p>
              <p className="mt-2 text-base font-semibold">
                {result.chargeHours ? `${result.chargeHours} horas` : "No disponible"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Carga recomendada</p>
              <p className="mt-2 text-base font-semibold">{result.recommendationCurrent}A</p>
            </div>
          </div>

          {result.batteryTypeWarnings.length > 0 && (
            <div className="mt-4 rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-200">
              {result.batteryTypeWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          {!result.compatible && (
            <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200">
              <p className="font-semibold">Recomendación</p>
              <p className="mt-2">
                Busca un cargador de <strong>{result.voltage}V</strong> y aproximadamente <strong>{result.recommendationCurrent}A</strong> para tu batería.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

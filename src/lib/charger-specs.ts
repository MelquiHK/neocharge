/**
 * Utilidades puras para extraer las especificaciones técnicas de un
 * cargador (voltaje, corriente, tipos de batería) desde el texto de
 * `specifications` y, como respaldo, desde el nombre del producto
 * (ej. "Cargador de 72V/5A" → 72V/5A).
 */

export interface ChargerSpecs {
  voltage?: number;
  current?: number;
  batteryTypes?: string[];
}

export const parseNumber = (value: string | number | null | undefined): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const cleaned = String(value)
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "")
    .trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseChargerSpecsText = (text: string | null | undefined): ChargerSpecs => {
  const specs: ChargerSpecs = {};
  if (!text) return specs;
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (/volt/i.test(line) || /v\b/i.test(line)) {
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

/**
 * Extrae las especificaciones de un cargador. Primero intenta con el texto
 * de `specifications`; el voltaje/corriente que falten se completan desde
 * el nombre del producto (los datos del texto siempre tienen prioridad).
 */
export const parseChargerSpecifications = (
  raw: string | null | undefined,
  productName?: string | null
): ChargerSpecs => {
  const specs = parseChargerSpecsText(raw);

  if (specs.voltage === undefined || specs.current === undefined) {
    const fromName = parseChargerSpecsText(productName);
    if (specs.voltage === undefined) specs.voltage = fromName.voltage;
    if (specs.current === undefined) specs.current = fromName.current;
    if (fromName.batteryTypes?.length) {
      specs.batteryTypes = [
        ...new Set([...(specs.batteryTypes ?? []), ...fromName.batteryTypes]),
      ];
    }
  }

  return specs;
};

export const getRecommendedCurrent = (capacityAh: number): number => {
  const recommended = Math.max(2, Math.min(10, Math.round(capacityAh * 0.15)));
  return recommended;
};

export const getBatteryTypeLabel = (type: string): string => {
  if (type === "lifepo4") return "LiFePO4";
  if (type === "lead-acid") return "Plomo-ácido / Gel";
  if (type === "lithium") return "Litio";
  return "Desconocido";
};

export const formatChargerSpecs = (specs: ChargerSpecs): string => {
  const parts: string[] = [];
  if (specs.voltage) parts.push(`${specs.voltage}V`);
  if (specs.current) parts.push(`${specs.current}A`);
  if (specs.batteryTypes?.length) parts.push(specs.batteryTypes.join(" / "));
  return parts.length > 0 ? parts.join(" · ") : "Especificaciones no disponibles";
};

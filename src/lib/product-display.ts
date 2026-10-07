import { parseChargerSpecifications } from "@/lib/charger-specs";

interface BatteryProduct {
  name?: string | null;
  specifications?: string | null;
  warranty_type?: string | null;
}

/**
 * Etiqueta del tipo de batería para la que sirve un cargador, derivada de
 * sus especificaciones (ya corregidas en la BD: todos los cargadores
 * actuales son solo para litio). Devuelve null si no es un cargador o no
 * se detecta el tipo.
 */
export function batteryTypeChip(product: BatteryProduct): string | null {
  const isCharger =
    product.warranty_type === "charger" ||
    /cargador/i.test(product.name ?? "");
  if (!isCharger) return null;
  const types = parseChargerSpecifications(
    product.specifications,
    product.name,
  ).batteryTypes;
  if (!types?.length) return null;
  if (types.includes("Li-ion")) return "Para baterías de litio";
  if (types.includes("LiFePO4")) return "Para baterías LiFePO4";
  if (types.includes("Plomo-ácido/Gel"))
    return "Para baterías de plomo-ácido/gel";
  return null;
}

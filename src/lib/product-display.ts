import { parseChargerSpecifications } from "@/lib/charger-specs";
import { isChargerWarranty } from "@/lib/format";

interface BatteryProduct {
  name?: string | null;
  specifications?: string | null;
  warranty_type?: string | null;
  battery_type?: string | null;
}

/**
 * Etiqueta del tipo de batería para la que sirve un cargador.
 * Usa el campo explícito `battery_type` que Mel pone en el admin
 * ('litio' | 'gel' | 'lifepo4'); si está vacío, deriva de las
 * especificaciones como antes. Devuelve null si no es un cargador.
 */
export function batteryTypeChip(product: BatteryProduct): string | null {
  const isCharger =
    isChargerWarranty(product.warranty_type) ||
    /cargador/i.test(product.name ?? "");
  if (!isCharger) return null;
  // Campo explícito del admin: manda sobre la heurística.
  switch ((product.battery_type ?? "").toLowerCase()) {
    case "litio":
      return "Para baterías de litio";
    case "gel":
      return "Para baterías de plomo-ácido/gel";
    case "lifepo4":
      return "Para baterías LiFePO4";
  }
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

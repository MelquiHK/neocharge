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

/**
 * Reseñas mostradas por producto: valores deterministas derivados del id
 * (el mismo producto siempre muestra lo mismo), con rating entre 4.0 y 5.0
 * — nunca baja de 4 estrellas.
 */
export function productRating(id: string): { rating: string; count: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  const rating = (4 + (h % 11) / 10).toFixed(1);
  const count = 18 + (h % 223);
  return { rating, count };
}

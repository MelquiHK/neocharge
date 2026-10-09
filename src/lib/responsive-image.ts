/**
 * Genera srcset/sizes para imágenes de producto.
 * Si la URL es del Storage público de Supabase, usa su API de transformación
 * (/render/image) para pedir versiones redimensionadas; si no, devuelve la
 * URL original sin srcset (no se puede redimensionar en el servidor).
 */

const WIDTHS = [400, 800, 1200];

function toRenderUrl(url: string, width: number): string | null {
  // https://<proyecto>.supabase.co/storage/v1/object/public/<bucket>/<path>
  //   -> https://<proyecto>.supabase.co/storage/v1/render/image/public/<bucket>/<path>?width=..&quality=..
  const m = url.match(/^(https:\/\/[^/]+\/storage\/v1\/)object\/public\/(.+)$/);
  if (!m) return null;
  // NOTA (2026-10-05): el parámetro resize=contain es OBLIGATORIO.
  // Sin él, Supabase usa resize=cover por defecto y con solo width
  // devuelve (width × alto_original) — p. ej. una imagen 1024×1024
  // pedida con ?width=400 llegaba como 400×1024 (tira vertical),
  // y con object-cover en la tarjeta cuadrada se veía super-ampliada.
  return `${m[1]}render/image/public/${m[2]}?width=${width}&quality=80&resize=contain`;
}

export interface ResponsiveImage {
  src: string;
  srcSet?: string;
  sizes?: string;
}

/**
 * @param url URL original de la imagen
 * @param sizes valor del atributo sizes según el layout donde se muestra
 * @param widths anchos a pedir (por defecto [400, 800, 1200]).
 *   En modo ahorro de datos se pasa DATA_SAVER_WIDTHS ([200, 400]).
 */
export function responsiveImage(url: string, sizes: string, widths: number[] = WIDTHS): ResponsiveImage {
  const entries = widths.map((w) => {
    const rw = toRenderUrl(url, w);
    return rw ? `${rw} ${w}w` : null;
  }).filter(Boolean) as string[];

  if (entries.length === 0) {
    return { src: url };
  }
  // src apunta a la versión mediana del conjunto pedido.
  const fallback = toRenderUrl(url, widths[Math.min(1, widths.length - 1)]) ?? url;
  return { src: fallback, srcSet: entries.join(", "), sizes };
}

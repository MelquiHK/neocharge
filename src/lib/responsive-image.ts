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
  return `${m[1]}render/image/public/${m[2]}?width=${width}&quality=80`;
}

export interface ResponsiveImage {
  src: string;
  srcSet?: string;
  sizes?: string;
}

/**
 * @param url URL original de la imagen
 * @param sizes valor del atributo sizes según el layout donde se muestra
 */
export function responsiveImage(url: string, sizes: string): ResponsiveImage {
  const entries = WIDTHS.map((w) => {
    const rw = toRenderUrl(url, w);
    return rw ? `${rw} ${w}w` : null;
  }).filter(Boolean) as string[];

  if (entries.length === 0) {
    return { src: url };
  }
  // src apunta a la versión mediana por defecto.
  const fallback = toRenderUrl(url, 800) ?? url;
  return { src: fallback, srcSet: entries.join(", "), sizes };
}

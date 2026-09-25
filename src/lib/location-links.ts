/**
 * Parseo de ubicaciones para la calculadora pública de envíos.
 * Puro (sin red): entiende coordenadas sueltas, enlaces de Google Maps,
 * MAPS.ME (ge0), enlaces compartidos de WhatsApp y Apple Maps.
 */

export interface ParsedCoords {
  lat: number;
  lng: number;
  source: "coords" | "mapsme" | "google" | "whatsapp" | "apple";
  label?: string;
}

// Alfabeto URL-safe base64 usado por el formato ge0 de MAPS.ME.
const GE0_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * Decodifica un código ge0 de MAPS.ME (10 caracteres).
 * El primer carácter es el zoom y se ignora; los 9 restantes son 54 bits:
 * los bits en posiciones pares forman la latitud (27 bits) y los impares
 * la longitud (27 bits).
 * lat = v/2^27*180-90 ; lng = v/2^27*360-180
 */
export function decodeGe0(code: string): ParsedCoords | null {
  if (!code || code.length !== 10) return null;
  let latBits = 0;
  let lngBits = 0;
  for (let i = 1; i < 10; i++) {
    const v = GE0_ALPHABET.indexOf(code[i]);
    if (v < 0) return null;
    for (let b = 5; b >= 0; b--) {
      const bit = (v >> b) & 1;
      const pos = (i - 1) * 6 + (5 - b); // posición 0..53 en el flujo de bits
      if (pos % 2 === 0) latBits = (latBits << 1) | bit;
      else lngBits = (lngBits << 1) | bit;
    }
  }
  const lat = (latBits / 2 ** 27) * 180 - 90;
  const lng = (lngBits / 2 ** 27) * 360 - 180;
  return makeCoords(lat, lng, "mapsme");
}

function makeCoords(
  lat: number,
  lng: number,
  source: ParsedCoords["source"],
): ParsedCoords | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng, source };
}

/**
 * Extrae coordenadas de una URL: MAPS.ME (ge0), Google Maps (@, ?q=, ?query=,
 * ?daddr=, /place/.../@), enlaces de WhatsApp (maps.google.com/maps?q=loc:…)
 * y Apple Maps (?ll=).
 */
export function extractCoordsFromUrl(url: string): ParsedCoords | null {
  if (!url) return null;

  // MAPS.ME: https://maps.me/link/ge0/<10 chars>/... o https://ge0.me/<code>/...
  const ge0 =
    url.match(/\/ge0\/([A-Za-z0-9\-_]{10})/) ||
    url.match(/ge0\.me\/([A-Za-z0-9\-_]{10})/);
  if (ge0) {
    const decoded = decodeGe0(ge0[1]);
    if (decoded) return decoded;
  }

  // Google: /@lat,lng  (también cubre /place/.../@lat,lng)
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return makeCoords(Number(m[1]), Number(m[2]), "google");

  // ?q= / ?query= / ?ll= / ?daddr= con prefijo "loc:" opcional (WhatsApp usa q=loc:)
  m = url.match(/[?&](?:q|query|ll|daddr)=(?:loc:)?(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (m) {
    const isWhatsapp = /maps\.google\.com\/maps/i.test(url);
    const isApple = /[?&]ll=/i.test(url);
    const source: ParsedCoords["source"] = isWhatsapp
      ? "whatsapp"
      : isApple
        ? "apple"
        : "google";
    return makeCoords(Number(m[1]), Number(m[2]), source);
  }

  return null;
}

/**
 * Punto de entrada principal: acepta coordenadas sueltas ("23.13, -82.39"),
 * enlaces completos o texto que contenga una URL.
 */
export function parseLocationInput(text: string): ParsedCoords | null {
  const t = (text || "").trim();
  if (!t) return null;

  if (/https?:\/\//i.test(t)) {
    const urls = t.match(/https?:\/\/[^\s)]+/gi) || [];
    for (const u of urls) {
      const c = extractCoordsFromUrl(u);
      if (c) return c;
    }
    return null;
  }

  const m = t.match(/(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (m) return makeCoords(Number(m[1]), Number(m[2]), "coords");

  return null;
}

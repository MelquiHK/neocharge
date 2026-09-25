/**
 * Limpieza y clasificación de las especificaciones de producto.
 * Las líneas "Etiqueta: valor" se clasifican como filas de definición y
 * el resto como viñetas; los marcadores iniciales duplicados ("•", "-",
 * "✓", "✔", "*", …) se eliminan de forma defensiva.
 */

export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecGroup {
  title?: string;
  rows: SpecRow[];
  bullets: string[];
}

/**
 * Limpia una línea de especificación: quita marcadores de viñeta
 * duplicados al inicio ("•", "-", "✓", "✔", "*", "·", ">") y espacios
 * sobrantes. No toca el contenido real de la línea.
 */
export function cleanSpecLine(line: string | null | undefined): string {
  if (line == null) return "";
  let s = String(line).trim();
  // Repite por si hay varios marcadores encadenados ("✓ • texto").
  let prev: string | null = null;
  while (prev !== s) {
    prev = s;
    s = s.replace(/^[•◦▪·*✓✔✅❖‣∙>]\s*/, "");
    s = s.replace(/^-\s+/, "");
  }
  // Guion pegado ("-texto") pero nunca un número negativo ("-20°C").
  s = s.replace(/^-(?!\d)/, "").trim();
  return s.trim();
}

// "Batería: 20,000 mAh reales" → etiqueta + valor. La etiqueta no puede
// ser muy larga ni contener ":" y el valor no puede quedar vacío.
const KEY_VALUE_PATTERN = /^([^:]{1,42}):[ \t]+(.+)$/;

function classifyLine(line: string, rows: SpecRow[], bullets: string[]): void {
  const clean = cleanSpecLine(line);
  if (!clean) return;
  // Una URL nunca es una etiqueta.
  if (/^https?:\/\//i.test(clean)) {
    bullets.push(clean);
    return;
  }
  const match = clean.match(KEY_VALUE_PATTERN);
  if (match) {
    rows.push({ label: match[1].trim(), value: match[2].trim() });
  } else {
    bullets.push(clean);
  }
}

/**
 * Convierte el texto crudo de `specifications` en grupos renderizables.
 * Acepta JSON (array de strings, array de {title, items}, objeto
 * {clave: valor}) o texto plano con una especificación por línea.
 */
export function parseSpecGroups(raw: string | null | undefined): SpecGroup[] {
  if (raw == null) return [];
  const text = String(raw);
  if (!text.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(text);

    if (Array.isArray(parsed)) {
      const groups: SpecGroup[] = [];
      let current: SpecGroup | null = null;
      const flushCurrent = () => {
        if (current && (current.rows.length > 0 || current.bullets.length > 0)) {
          groups.push(current);
        }
        current = null;
      };

      for (const item of parsed) {
        if (typeof item === "string") {
          if (!current) current = { rows: [], bullets: [] };
          classifyLine(item, current.rows, current.bullets);
        } else if (item !== null && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const title =
            typeof obj.title === "string" && obj.title.trim()
              ? cleanSpecLine(obj.title)
              : undefined;
          if (Array.isArray(obj.items)) {
            flushCurrent();
            const group: SpecGroup = { title, rows: [], bullets: [] };
            for (const entry of obj.items) {
              classifyLine(String(entry), group.rows, group.bullets);
            }
            groups.push(group);
          } else if (typeof obj.value === "string") {
            if (!current) current = { rows: [], bullets: [] };
            if (title) {
              const value = cleanSpecLine(obj.value);
              if (value) current.rows.push({ label: title, value });
            } else {
              classifyLine(obj.value, current.rows, current.bullets);
            }
          } else {
            flushCurrent();
            const group: SpecGroup = { title, rows: [], bullets: [] };
            for (const [key, value] of Object.entries(obj)) {
              if (key === "title") continue;
              const label = cleanSpecLine(key);
              const val = cleanSpecLine(String(value));
              if (label && val) group.rows.push({ label, value: val });
            }
            groups.push(group);
          }
        }
      }
      flushCurrent();
      return groups.filter((g) => g.rows.length > 0 || g.bullets.length > 0 || g.title);
    }

    if (parsed !== null && typeof parsed === "object") {
      const rows: SpecRow[] = [];
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        const label = cleanSpecLine(key);
        const val = cleanSpecLine(String(value));
        if (label && val) rows.push({ label, value: val });
      }
      return rows.length > 0 ? [{ rows, bullets: [] }] : [];
    }

    const single = cleanSpecLine(String(parsed));
    return single ? [{ rows: [], bullets: [single] }] : [];
  } catch {
    // No es JSON: una especificación por línea.
    const rows: SpecRow[] = [];
    const bullets: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      classifyLine(line, rows, bullets);
    }
    return rows.length > 0 || bullets.length > 0 ? [{ rows, bullets }] : [];
  }
}

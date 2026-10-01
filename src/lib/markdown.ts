const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Formato inline: negritas, cursivas, enlaces e imágenes. */
const inline = (text: string) =>
  text
    .replace(
      /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,
      '<img src="$2" alt="$1" class="rounded-2xl border border-slate-200 bg-slate-100 p-2 max-w-full" />'
    )
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g,
      (_m, label: string, url: string) => {
        const external = /^https?:\/\//.test(url);
        const cls =
          "text-primary underline decoration-primary/30 hover:decoration-primary";
        return external
          ? `<a href="${url}" target="_blank" rel="noreferrer noopener" class="${cls}">${label}</a>`
          : `<a href="${url}" class="${cls}">${label}</a>`;
      }
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");

/**
 * Convierte letras/dígitos Unicode "mathematical bold" y "sans-serif bold"
 * (𝗘𝗹 𝗩𝗼𝗹𝘁𝗮𝗴𝗲) en sus equivalentes ASCII normales.
 */
const demathBold = (text: string): string => {
  const ranges: Array<[number, number, number]> = [
    [0x1d5a0, 0x1d5b9, 0x30], // 𝟎-𝟗
    [0x1d400, 0x1d419, 0x41], // 𝐀-𝐙
    [0x1d41a, 0x1d433, 0x61], // 𝐚-𝐳
    [0x1d5d4, 0x1d5ed, 0x41], // 𝖠-𝖹 (sans-serif bold)
    [0x1d5ee, 0x1d607, 0x61], // 𝖺-𝗓 (sans-serif bold)
  ];
  return text.replace(/[\u{1D400}-\u{1D433}\u{1D5A0}-\u{1D607}]/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    for (const [from, to, base] of ranges) {
      if (cp >= from && cp <= to) return String.fromCodePoint(base + (cp - from));
    }
    return ch;
  });
};

const LIST_ITEM = /^(?:[-*+]|\d+[.)])\s+(.*)$/;
const HEADING_LINE = /^#{1,3}\s+/;

/**
 * Detecta un encabezado de sección numerada en sus formas comunes:
 *   "**N. Título** resto" | "N. **Título** resto" | "N. **Título:** resto" | "N. Título"
 * Devuelve el número, el título limpio y el resto de la línea como inicio del cuerpo.
 */
const parseNumberedHeading = (
  line: string
): { num: string; title: string; rest: string } | null => {
  const t = line.trim();
  let m = t.match(/^\*\*(\d+)\.\s+(.+?)\*\*\s*:?\s*(.*)$/);
  if (m) return { num: m[1], title: m[2].trim(), rest: m[3].trim() };
  m = t.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*:?\s*(.*)$/);
  if (m) return { num: m[1], title: m[2].trim(), rest: m[3].trim() };
  m = t.match(/^(\d+)\.\s+(.+)$/);
  if (m) return { num: m[1], title: m[2].trim(), rest: "" };
  return null;
};

/**
 * Normaliza el texto crudo de un artículo del blog en tiempo de
 * renderizado (NO toca Supabase). Corrige problemas de formato que
 * vienen del origen:
 *  - caracteres zero-width y BOM
 *  - negritas Unicode "matemáticas" → texto normal
 *  - líneas que intentaban abrir negrita pero quedaron mal
 *    ("*,5. ..." → "**5. ...")
 *  - viñetas "•" → "-"
 *  - secciones numeradas ("N. Título" o "**N. Título**") seguidas de
 *    párrafos de cuerpo → lista ordenada real
 */
export const normalizeArticleContent = (raw: string): string => {
  // 1. Limpieza de caracteres invisibles y negritas Unicode.
  let text = (raw || "")
    .replace(/[\u200b\u200c\ufeff]|\u200d/g, "")
    .replace(/\r\n?/g, "\n");
  text = demathBold(text);

  // 2. Líneas que abren con "*,N." en vez de "**N.": reparar el inicio de la negrita.
  text = text.replace(/^(\s*)\*,(\d+\.)/gm, "$1**$2");

  // 3. Viñetas "•" → "-".
  text = text.replace(/^[ \t]*•[ \t]+/gm, "- ");

  // 4. Agrupar secciones numeradas en lista ordenada real: el encabezado
  // "N. Título" (o "**N. Título**" / "N. **Título**") más todo su cuerpo forman
  // UN item; los items consecutivos quedan en el mismo bloque (una sola <ol>).
  // El cuerpo se corta ante un encabezado markdown (## ...) o el siguiente
  // item numerado, para no tragarse el resto del artículo.
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const head = parseNumberedHeading(lines[i]);
    if (head) {
      const body: string[] = [];
      if (head.rest) body.push(head.rest);
      i += 1;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (HEADING_LINE.test(t)) break;
        if (parseNumberedHeading(lines[i])) break;
        if (t) body.push(t);
        i += 1;
      }
      // El cuerpo queda dentro del item: párrafos unidos con salto simple.
      const bodyText = body.join("\n").replace(/\n{2,}/g, "\n").trim();
      out.push(`${head.num}. **${head.title}**${bodyText ? ` — ${bodyText}` : ""}`);
    } else {
      out.push(lines[i]);
      i += 1;
    }
  }
  return out.join("\n");
};

const TIP_LINE = /^(Tip pro|Consejo extra|Nota|Importante)\s*:\s*(.+)$/i;

const renderTipLine = (label: string, rest: string) =>
  `<div class="rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 my-2"><strong>${label}:</strong> ${inline(rest)}</div>`;

type ListPart = { kind: "text"; lines: string[] } | { kind: "list"; lines: string[] };

// Una línea que abre un bloque nuevo (encabezado, cita, código): corta la lista.
const BLOCK_START = /^(#{1,3}\s+|>\s*|```)/;

const renderList = (lines: string[]): { html: string; rest: string[] } => {
  // Consumir solo las líneas de la lista; un bloque nuevo la interrumpe.
  let end = 0;
  while (end < lines.length && !BLOCK_START.test(lines[end].trim())) end += 1;
  const listLines = lines.slice(0, end);
  const rest = lines.slice(end);

  const ordered = /^\d+[.)]\s+/.test(listLines[0]);
  // Items con partes ordenadas: texto y sublistas en el orden del original.
  // Un marcador de tipo distinto abre una sublista dentro del item actual;
  // una línea sin marcador la cierra y continúa el texto del item.
  const items: ListPart[][] = [];
  let parts: ListPart[] | null = null;

  const textPart = (): string[] => {
    if (!parts) {
      parts = [];
      items.push(parts);
    }
    const last = parts[parts.length - 1];
    if (!last || last.kind !== "text") {
      const p: ListPart = { kind: "text", lines: [] };
      parts.push(p);
      return p.lines;
    }
    return last.lines;
  };

  for (const line of listLines) {
    const m = line.match(LIST_ITEM);
    if (m) {
      const lineOrdered = /^\d+[.)]\s+/.test(line);
      if (!parts || lineOrdered === ordered) {
        parts = [];
        items.push(parts);
        parts.push({ kind: "text", lines: [m[1]] });
      } else {
        const last = parts[parts.length - 1];
        if (!last || last.kind !== "list") {
          parts.push({ kind: "list", lines: [] });
        }
        (parts[parts.length - 1] as { kind: "list"; lines: string[] }).lines.push(line);
      }
    } else if (parts) {
      textPart().push(line);
    }
  }

  const tag = ordered ? "ol" : "ul";
  const itemsHtml = items
    .map((itemParts) => {
      const body = itemParts
        .map((part) => {
          if (part.kind === "list") {
            const sub = renderList(part.lines);
            return sub.html + (sub.rest.length ? renderMarkdown(sub.rest.join("\n")) : "");
          }
          // Dentro del texto: las líneas de consejo se destacan.
          const html: string[] = [];
          let buf: string[] = [];
          const flush = () => {
            if (buf.length) {
              html.push(buf.map((l) => inline(l)).filter(Boolean).join("<br />"));
              buf = [];
            }
          };
          for (const l of part.lines) {
            const tip = l.match(TIP_LINE);
            if (tip) {
              flush();
              html.push(renderTipLine(tip[1], tip[2]));
            } else {
              buf.push(l);
            }
          }
          flush();
          return html.join("");
        })
        .join("");
      return `<li>${body}</li>`;
    })
    .join("");
  return { html: `<${tag}>${itemsHtml}</${tag}>`, rest };
};

export const renderMarkdown = (raw: string) => {
  const sanitized = escapeHtml(raw || "");
  const out: string[] = [];
  for (const block of sanitized.split(/\n{2,}/)) {
    const lines = block.split("\n");
    // Lista: el bloque empieza con un marcador; las líneas siguientes que no
    // lo tienen son continuación del item anterior, salvo que abran un
    // bloque nuevo (encabezado, cita, código).
    if (LIST_ITEM.test(lines[0])) {
      const { html, rest } = renderList(lines);
      out.push(html);
      if (rest.length) out.push(renderMarkdown(rest.join("\n")));
      continue;
    }

    const heading = lines[0].match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = Math.min(3, heading[1].length);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    // Párrafo de consejo ("Tip pro:", "Consejo extra:") → callout destacado.
    if (lines.length === 1) {
      const tip = lines[0].match(TIP_LINE);
      if (tip) {
        out.push(
          `<p class="rounded-2xl border border-accent/25 bg-accent/10 px-5 py-4"><strong>${tip[1]}:</strong> ${inline(tip[2])}</p>`
        );
        continue;
      }
    }

    out.push(`<p>${lines.map((line) => inline(line)).join("<br />")}</p>`);
  }
  return out.join("");
};

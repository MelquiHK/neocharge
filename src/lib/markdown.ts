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
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer noopener" class="text-primary underline decoration-primary/30 hover:decoration-primary">$1</a>'
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
const NUMBERED_HEADING = /^(?:\*\*)?(\d+)\.\s+(.+?)(?:\*\*)?$/;

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
  // "N. Título" (o "**N. Título**") más todo su cuerpo forman UN item;
  // los items consecutivos quedan en el mismo bloque (una sola <ol>).
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const head = lines[i].trim().match(NUMBERED_HEADING);
    if (head) {
      const num = head[1];
      const title = head[2];
      i += 1;
      // Saltar líneas en blanco entre el encabezado y su cuerpo.
      while (i < lines.length && lines[i].trim() === "") i += 1;
      const body: string[] = [];
      while (i < lines.length && !lines[i].trim().match(NUMBERED_HEADING)) {
        body.push(lines[i].trim());
        i += 1;
      }
      // El cuerpo queda dentro del item: párrafos unidos con salto simple.
      const bodyText = body.join("\n").replace(/\n{2,}/g, "\n").trim();
      out.push(`${num}. **${title}**${bodyText ? ` — ${bodyText}` : ""}`);
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

const renderList = (lines: string[]): string => {
  const ordered = /^\d+[.)]\s+/.test(lines[0]);
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

  for (const line of lines) {
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
          if (part.kind === "list") return renderList(part.lines);
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
  return `<${tag}>${itemsHtml}</${tag}>`;
};

export const renderMarkdown = (raw: string) => {
  const sanitized = escapeHtml(raw || "");
  const blocks = sanitized.split(/\n{2,}/).map((block) => {
    const lines = block.split("\n");
    // Lista: el bloque empieza con un marcador; las líneas siguientes que no
    // lo tienen son continuación del item anterior.
    if (LIST_ITEM.test(lines[0])) {
      return renderList(lines);
    }

    const heading = lines[0].match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = Math.min(3, heading[1].length);
      return `<h${level}>${inline(heading[2])}</h${level}>`;
    }

    // Párrafo de consejo ("Tip pro:", "Consejo extra:") → callout destacado.
    if (lines.length === 1) {
      const tip = lines[0].match(TIP_LINE);
      if (tip) {
        return `<p class="rounded-2xl border border-accent/25 bg-accent/10 px-5 py-4"><strong>${tip[1]}:</strong> ${inline(tip[2])}</p>`;
      }
    }

    return `<p>${lines.map((line) => inline(line)).join("<br />")}</p>`;
  });
  return blocks.join("");
};

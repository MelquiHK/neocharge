const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderMarkdown = (raw: string) => {
  const sanitized = escapeHtml(raw || "");
  const blocks = sanitized.split(/\n{2,}/).map((block) => {
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*+]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${line.replace(/^[-*+]\s+/, "")}</li>`).join("");
      return `<ul>${items}</ul>`;
    }

    const heading = lines[0].match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = Math.min(3, heading[1].length);
      return `<h${level}>${heading[2]}</h${level}>`;
    }

    return `<p>${lines
      .map((line) =>
        line
          .replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-2xl border border-slate-200 bg-slate-100 p-2 max-w-full" />')
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener" class="text-primary underline decoration-primary/30 hover:decoration-primary">$1</a>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/__(.+?)__/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/_(.+?)_/g, '<em>$1</em>')
      )
      .join("<br />")}</p>`;
  });
  return blocks.join("");
};

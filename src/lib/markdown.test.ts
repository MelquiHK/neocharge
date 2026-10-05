import { describe, expect, it } from "vitest";
import { normalizeArticleContent, renderMarkdown } from "./markdown";

describe("markdown del blog", () => {
  it("convierte links relativos sin target=_blank", () => {
    const html = renderMarkdown("Pásate por la [tienda](/tienda).");
    expect(html).toContain('<a href="/tienda"');
    expect(html).not.toContain('href="/tienda" target="_blank"');
    expect(html).toContain(">tienda</a>");
  });

  it("mantiene target=_blank en links externos", () => {
    const html = renderMarkdown("Ver [sitio](https://ejemplo.com).");
    expect(html).toContain('href="https://ejemplo.com" target="_blank"');
  });

  it("no se traga un ## que viene después de una lista numerada", () => {
    const raw = [
      "1. **La etiqueta**: busca el voltaje.",
      "2. **El manual**: ahí viene el dato.",
      "",
      "## La regla de oro",
      "",
      "Texto final.",
    ].join("\n");
    const html = renderMarkdown(normalizeArticleContent(raw));
    expect(html).toContain("<h2>La regla de oro</h2>");
    expect(html).not.toContain("— ##");
    expect(html).toContain("<ol>");
  });

  it("parte bien el título en negrita del cuerpo en items numerados", () => {
    const raw = "1. **La etiqueta de la batería**: casi todas lo traen impreso.";
    const html = renderMarkdown(normalizeArticleContent(raw));
    expect(html).toContain("<strong>La etiqueta de la batería</strong>");
    expect(html).not.toContain("****");
    expect(html).not.toContain("*La etiqueta");
  });

  it("agrupa encabezado numerado con su cuerpo en un solo item", () => {
    const raw = ["**1. Revisa el voltaje**", "", "Mide con un multímetro primero."].join(
      "\n"
    );
    const html = renderMarkdown(normalizeArticleContent(raw));
    expect(html).toContain("<ol>");
    expect(html).toContain("Revisa el voltaje");
    expect(html).toContain("Mide con un multímetro primero.");
  });
});

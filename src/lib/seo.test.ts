import { describe, expect, it } from "vitest";
import { seoConfig, SITE_URL } from "./seo";

// Cada página que usa useSEO("clave") necesita su clave en seoConfig;
// si falta, el título de la página nunca se establece (bug silencioso).
const EXPECTED_KEYS = [
  "home",
  "shop",
  "productDetail",
  "checkout",
  "auth",
  "account",
  "about",
  "contact",
  "blog",
  "blogPost",
  "garantia",
  "faq",
  "favorites",
  "services",
  "calcular",
  "legal",
];

describe("seoConfig", () => {
  it("tiene clave para cada página que usa useSEO", () => {
    for (const key of EXPECTED_KEYS) {
      expect(seoConfig[key], `falta la clave SEO "${key}"`).toBeDefined();
    }
  });

  it("toda clave tiene título y descripción no vacíos", () => {
    for (const [key, cfg] of Object.entries(seoConfig)) {
      expect(cfg.title?.trim().length, `${key}.title`).toBeGreaterThan(0);
      expect(cfg.description?.trim().length, `${key}.description`).toBeGreaterThan(0);
    }
  });

  it("los títulos usan la marca con mayúscula correcta (NeoCharge)", () => {
    for (const [key, cfg] of Object.entries(seoConfig)) {
      // Ninguna variante mal capitalizada como "Neocharge"
      const bad = cfg.title.includes("Neocharge") && !cfg.title.includes("NeoCharge");
      expect(bad, `${key}.title`).toBe(false);
    }
  });

  it("SITE_URL es el dominio canónico de producción", () => {
    expect(SITE_URL).toBe("https://tienda-neocharge.vercel.app");
  });
});

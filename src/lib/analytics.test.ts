import { describe, expect, it } from "vitest";
import {
  countByReferrer,
  countViewsByDay,
  extractProductSlug,
  topProductsBySales,
  topSlugsByViews,
} from "./analytics";

const SITE = "https://tienda-neocharge.vercel.app";

// classifyReferrer es interno: se ejerce vía countByReferrer.
describe("countByReferrer (clasificación de orígenes)", () => {
  const labels = (rows: { referrer: string | null }[]) =>
    Object.fromEntries(countByReferrer(rows, SITE).map((r) => [r.label, r.count]));

  it("detecta buscadores y redes", () => {
    expect(
      labels([
        { referrer: "https://www.google.com/search?q=cargador" },
        { referrer: "https://www.google.com.cu/" },
        { referrer: "https://m.facebook.com/algogrupo" },
        { referrer: "https://www.instagram.com/p/xyz" },
        { referrer: "https://www.tiktok.com/@neocharge" },
        { referrer: "https://www.revolico.com/item/123" },
      ])
    ).toEqual({ Google: 2, Facebook: 1, Instagram: 1, TikTok: 1, Revolico: 1 });
  });

  it("directo cuando no hay referrer", () => {
    expect(countByReferrer([{ referrer: null }, { referrer: "" }, { referrer: null }], SITE)).toEqual([
      { label: "Directo", count: 3 },
    ]);
  });

  it("interno cuando viene del propio sitio", () => {
    expect(
      countByReferrer(
        [
          { referrer: "https://tienda-neocharge.vercel.app/" },
          { referrer: "https://tienda-neocharge.vercel.app/catalogo" },
        ],
        SITE
      )
    ).toEqual([{ label: "Interno", count: 2 }]);
  });

  it("otro para orígenes desconocidos", () => {
    expect(labels([{ referrer: "https://duckduckgo.com/?q=cargador" }, { referrer: "not-a-url" }])).toEqual({
      Otro: 1,
      Directo: 1,
    });
  });
});

describe("extractProductSlug", () => {
  it("extrae el slug de /producto/<slug>", () => {
    expect(extractProductSlug("/producto/cargador-72v-5a")).toBe("cargador-72v-5a");
    expect(extractProductSlug("/producto/cargador-72v-5a/")).toBe("cargador-72v-5a");
    expect(extractProductSlug("/producto/cargador-72v-5a?v=2")).toBe("cargador-72v-5a");
  });

  it("rechaza rutas que no son fichas", () => {
    expect(extractProductSlug("/")).toBeNull();
    expect(extractProductSlug("/catalogo")).toBeNull();
    expect(extractProductSlug("/producto")).toBeNull();
    expect(extractProductSlug(null)).toBeNull();
  });
});

describe("countViewsByDay", () => {
  it("agrupa por día y rellena días sin vistas", () => {
    const now = new Date("2026-10-01T12:00:00");
    const rows = [
      { created_at: "2026-10-01T08:00:00Z" },
      { created_at: "2026-10-01T09:00:00Z" },
      { created_at: "2026-09-29T10:00:00Z" },
      { created_at: "no-fecha" },
    ];
    const buckets = countViewsByDay(rows, 3, now);
    expect(buckets).toHaveLength(3);
    expect(buckets[0].date).toBe("2026-09-29");
    expect(buckets[0].count).toBe(1);
    expect(buckets[1].date).toBe("2026-09-30");
    expect(buckets[1].count).toBe(0);
    expect(buckets[2].date).toBe("2026-10-01");
    expect(buckets[2].count).toBe(2);
  });
});

describe("topSlugsByViews", () => {
  it("ordena por vistas e ignora rutas no producto", () => {
    const rows = [
      { path: "/producto/a" },
      { path: "/producto/b" },
      { path: "/producto/a" },
      { path: "/catalogo" },
      { path: "/producto/a" },
    ];
    const top = topSlugsByViews(rows, 10);
    expect(top).toEqual([
      { slug: "a", count: 3 },
      { slug: "b", count: 1 },
    ]);
  });

  it("respeta el límite", () => {
    const rows = [{ path: "/producto/a" }, { path: "/producto/b" }];
    expect(topSlugsByViews(rows, 1)).toHaveLength(1);
  });
});

describe("topProductsBySales", () => {
  it("suma cantidades e ignora cancelados", () => {
    const orders = [
      {
        status: "delivered",
        items: [
          { id: "p1", name: "Cargador 72V 5A", quantity: 2, price: 60 },
          { id: "p2", name: "Enchufe 30A", quantity: 1, price: 30 },
        ],
      },
      { status: "cancelled", items: [{ id: "p1", name: "Cargador 72V 5A", quantity: 9, price: 60 }] },
      { status: "pending", items: [{ id: "p1", name: "Cargador 72V 5A", quantity: 1, price: 60 }] },
    ];
    const top = topProductsBySales(orders, 10);
    expect(top).toEqual([
      { id: "p1", name: "Cargador 72V 5A", qty: 3, revenue: 180 },
      { id: "p2", name: "Enchufe 30A", qty: 1, revenue: 30 },
    ]);
  });

  it("tolera items malformados", () => {
    const orders = [
      { status: "pending", items: null },
      { status: "pending", items: "no-array" },
      { status: "pending", items: [{ quantity: 2 }] },
    ];
    expect(topProductsBySales(orders, 10)).toEqual([]);
  });
});

describe("countByReferrer", () => {
  it("agrupa y ordena por origen", () => {
    const rows = [
      { referrer: "https://www.google.com/" },
      { referrer: "https://www.google.com/" },
      { referrer: null },
      { referrer: "https://m.facebook.com/x" },
    ];
    const counts = countByReferrer(rows, SITE);
    expect(counts[0]).toEqual({ label: "Google", count: 2 });
    expect(counts).toHaveLength(3);
  });
});

import { describe, expect, it } from "vitest";
import {
  normalizeSearchText,
  searchProducts,
  tokenizeQuery,
  type SearchProduct,
} from "./product-search";

const mk = (partial: Partial<SearchProduct>): SearchProduct => ({
  id: Math.random().toString(36).slice(2),
  name: "",
  slug: "",
  price: 10,
  currency: "USD",
  price_cup: null,
  extra_cup_per_usd: null,
  images: [],
  stock: 5,
  is_featured: false,
  description: null,
  warranty_type: null,
  ...partial,
});

const catalogo: SearchProduct[] = [
  mk({ name: "Cargador de 72V/5A para motos eléctricas", slug: "cargador-72v-5a" }),
  mk({ name: "Cargador 48V/3A", slug: "cargador-48v-3a" }),
  mk({ name: "Batería de litio 72V 35Ah", slug: "bateria-72v", description: "Para motos y triciclos" }),
  mk({ name: "Amplificador de audio 2000W", slug: "amplificador-2000w" }),
];

describe("product-search — normalización y tokens", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeSearchText("Batería ELÉCTRICA")).toBe("bateria electrica");
  });

  it("descarta muletillas y conserva voltajes", () => {
    expect(tokenizeQuery("cargador de 72v para moto")).toEqual(["cargador", "72v", "moto"]);
  });
});

describe("product-search — coincidencias", () => {
  it("encuentra por palabras sueltas, no por frase exacta", () => {
    const r = searchProducts(catalogo, "cargador 72v");
    expect(r.map((p) => p.slug)).toEqual(["cargador-72v-5a"]);
  });

  it("ignora acentos de la consulta", () => {
    const r = searchProducts(catalogo, "batería litio");
    expect(r.map((p) => p.slug)).toEqual(["bateria-72v"]);
  });

  it("busca también en la descripción", () => {
    const r = searchProducts(catalogo, "triciclos");
    expect(r.map((p) => p.slug)).toEqual(["bateria-72v"]);
  });

  it("respeta el límite y no inventa resultados", () => {
    expect(searchProducts(catalogo, "cargador", 1)).toHaveLength(1);
    expect(searchProducts(catalogo, "nevera")).toEqual([]);
    expect(searchProducts(catalogo, "de la")).toEqual([]);
  });
});

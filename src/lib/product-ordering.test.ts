import { describe, expect, it } from "vitest";
import { sortProductsForShop } from "./product-ordering";

describe("sortProductsForShop", () => {
  it("keeps featured products first and respects manual order for the rest", () => {
    const products = [
      { id: "1", is_featured: false, sort_order: 2, created_at: "2024-01-01T00:00:00Z" },
      { id: "2", is_featured: true, sort_order: 0, created_at: "2024-02-01T00:00:00Z" },
      { id: "3", is_featured: false, sort_order: 1, created_at: "2024-03-01T00:00:00Z" },
      { id: "4", is_featured: false, sort_order: 0, created_at: "2024-04-01T00:00:00Z" },
    ];

    const sorted = sortProductsForShop(products, "manual");

    expect(sorted.map((p) => p.id)).toEqual(["2", "4", "3", "1"]);
  });

  it("sorts newest products purely by date when requested (featured not pinned)", () => {
    const products = [
      { id: "a", is_featured: false, sort_order: 0, created_at: "2024-01-01T00:00:00Z" },
      { id: "b", is_featured: true, sort_order: 0, created_at: "2024-02-01T00:00:00Z" },
      { id: "c", is_featured: false, sort_order: 0, created_at: "2024-05-01T00:00:00Z" },
    ];

    const sorted = sortProductsForShop(products, "new");

    expect(sorted.map((p) => p.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts by category type after featured items", () => {
    const products = [
      { id: "1", is_featured: false, category_name: "Cables" },
      { id: "2", is_featured: true, category_name: "Accesorios" },
      { id: "3", is_featured: false, category_name: "Baterías" },
    ];

    const sorted = sortProductsForShop(products, "type");

    expect(sorted.map((p) => p.id)).toEqual(["2", "3", "1"]);
  });

  it("sends out-of-stock products last in every sort mode", () => {
    const products = [
      { id: "1", is_featured: false, sort_order: 0, stock: 0, price: 5 },
      { id: "2", is_featured: true, sort_order: 0, stock: 0, price: 5 },
      { id: "3", is_featured: false, sort_order: 1, stock: 5, price: 20 },
      { id: "4", is_featured: false, sort_order: 0, stock: 3, price: 10 },
    ];

    expect(sortProductsForShop(products, "manual").map((p) => p.id)).toEqual(["4", "3", "2", "1"]);
    // En price-asc los destacados NO se fijan: agotados al final, ordenados por precio.
    expect(sortProductsForShop(products, "price-asc").map((p) => p.id)).toEqual(["4", "3", "1", "2"]);
  });
});

import { describe, it, expect } from "vitest";
import { classifyConnection } from "./connection";

describe("classifyConnection", () => {
  it("sin navigator.onLine = offline", () => {
    expect(classifyConnection({ onLine: false })).toBe("offline");
  });

  it("online normal = online", () => {
    expect(classifyConnection({ onLine: true, effectiveType: "4g" })).toBe("online");
  });

  it("2g o slow-2g = degraded", () => {
    expect(classifyConnection({ onLine: true, effectiveType: "2g" })).toBe("degraded");
    expect(classifyConnection({ onLine: true, effectiveType: "slow-2g" })).toBe("degraded");
  });

  it("ahorro de datos = degraded", () => {
    expect(classifyConnection({ onLine: true, effectiveType: "4g", saveData: true })).toBe("degraded");
  });

  it("latencia mayor a 6s = degraded", () => {
    expect(classifyConnection({ onLine: true, latencyMs: 8000 })).toBe("degraded");
    expect(classifyConnection({ onLine: true, latencyMs: 1500 })).toBe("online");
  });

  it("sin señales extra = online", () => {
    expect(classifyConnection({ onLine: true })).toBe("online");
  });
});

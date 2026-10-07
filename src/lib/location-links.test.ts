import { describe, it, expect } from "vitest";
import { parseLocationInput } from "./location-links";

function closeTo(r: { lat: number; lng: number } | null, lat: number, lng: number) {
  expect(r).not.toBeNull();
  expect(Math.abs(r!.lat - lat)).toBeLessThan(0.01);
  expect(Math.abs(r!.lng - lng)).toBeLessThan(0.01);
}

// decodeGe0 y extractCoordsFromUrl son internos: se ejercen vía parseLocationInput.
describe("decodificación ge0 (vía parseLocationInput)", () => {
  it("decodifica Calle D, La Habana", () => {
    closeTo(parseLocationInput("https://maps.me/link/ge0/8mBG8awQqj/Calle_D"), 23.1345, -82.3913);
  });

  it("decodifica Minsk", () => {
    closeTo(parseLocationInput("https://ge0.me/w4aXJwx_yz/Minsk"), 53.9023, 27.5619);
  });

  it("rechaza códigos inválidos", () => {
    expect(parseLocationInput("https://maps.me/link/ge0/corto/x")).toBeNull();
    expect(parseLocationInput("https://maps.me/link/ge0/8mBG8awQq!/x")).toBeNull();
  });
});

describe("extracción de URLs (vía parseLocationInput)", () => {
  it("URL de Google con @", () => {
    const r = parseLocationInput("https://www.google.com/maps/@23.13,-82.39,15z");
    closeTo(r, 23.13, -82.39);
    expect(r!.source).toBe("google");
  });

  it("URL de Google con /place/ y @", () => {
    const r = parseLocationInput("https://www.google.com/maps/place/Algo/@23.13,-82.39,17z");
    closeTo(r, 23.13, -82.39);
  });

  it("enlace de WhatsApp (maps.google.com/maps?q=loc:)", () => {
    const r = parseLocationInput("https://maps.google.com/maps?q=loc:23.13,-82.39");
    closeTo(r, 23.13, -82.39);
    expect(r!.source).toBe("whatsapp");
  });

  it("URL de Apple Maps (?ll=)", () => {
    const r = parseLocationInput("https://maps.apple.com/?ll=23.13,-82.39&q=Algo");
    closeTo(r, 23.13, -82.39);
    expect(r!.source).toBe("apple");
  });

  it("enlace de MAPS.ME con ge0", () => {
    const r = parseLocationInput("https://maps.me/link/ge0/8mBG8awQqj/Calle_D");
    closeTo(r, 23.1345, -82.3913);
    expect(r!.source).toBe("mapsme");
  });
});

describe("parseLocationInput", () => {
  it("coordenadas sueltas", () => {
    const r = parseLocationInput("23.13, -82.39");
    closeTo(r, 23.13, -82.39);
    expect(r!.source).toBe("coords");
  });

  it("texto con enlace embebido", () => {
    const r = parseLocationInput(
      '📍 Calle "Calle D"\nLa Habana, Cuba\nAbrir en MAPS.ME:\nhttps://maps.me/link/ge0/8mBG8awQqj/Calle_D',
    );
    closeTo(r, 23.1345, -82.3913);
  });

  it("texto sin ubicación → null", () => {
    expect(parseLocationInput("hola mundo")).toBeNull();
    expect(parseLocationInput("")).toBeNull();
    expect(parseLocationInput("   ")).toBeNull();
  });

  it("coordenadas fuera de rango → null", () => {
    expect(parseLocationInput("95.0, -82.39")).toBeNull();
  });
});

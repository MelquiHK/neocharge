import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(async (url: string) => `data:image/png;base64,QR-${url}`),
  },
}));

// jsdom no dispara onload en Image: mock mínimo que sí lo hace.
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 512;
  height = 512;
  private _src = "";
  set src(v: string) {
    this._src = v;
    setTimeout(() => this.onload?.(), 0);
  }
  get src() {
    return this._src;
  }
}

import QRCode from "qrcode";
import { buildShareImage } from "./share-image";

describe("buildShareImage", () => {
  const realCreateElement = document.createElement.bind(document);
  let ctxStub: Record<string, unknown>;
  let canvasStub: Record<string, unknown>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("Image", MockImage as unknown as typeof Image);
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 800, height: 800 }) as unknown as ImageBitmap),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["foto"], { type: "image/jpeg" }),
      })),
    );

    ctxStub = {
      fillStyle: "",
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetY: 0,
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
    };
    canvasStub = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctxStub),
      toBlob: (cb: (b: Blob | null) => void) =>
        cb(new Blob(["jpeg"], { type: "image/jpeg" })),
    };
    createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation(((tag: string, ...rest: unknown[]) =>
        tag === "canvas"
          ? (canvasStub as unknown as HTMLElement)
          : realCreateElement(tag as never, ...(rest as []))) as typeof document.createElement);
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("genera un JPEG 1080x1080 con el QR de la URL del producto", async () => {
    const url = "https://tienda-neocharge.vercel.app/producto/cargador-de-72v-5a";
    const file = await buildShareImage("https://x/foto.jpg", url, "cargador-de-72v-5a");

    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ width: 512 }),
    );
    expect(canvasStub.width).toBe(1080);
    expect(canvasStub.height).toBe(1080);
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("cargador-de-72v-5a-neocharge.jpg");
    expect(file.type).toBe("image/jpeg");
  });

  it("dibuja el QR en la esquina inferior derecha (744,744 de 300px)", async () => {
    await buildShareImage(
      "https://x/foto.jpg",
      "https://tienda-neocharge.vercel.app/producto/x",
      "x",
    );
    const drawImage = ctxStub.drawImage as ReturnType<typeof vi.fn>;
    const qrCall = drawImage.mock.calls.find(
      (c) => c[1] === 744 && c[2] === 744 && c[3] === 300 && c[4] === 300,
    );
    expect(qrCall, "el QR debe dibujarse en la esquina inferior derecha").toBeDefined();
  });

  it("lanza excepción si la foto no carga (el llamador usa el plan B)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    await expect(
      buildShareImage("https://x/rota.jpg", "https://tienda-neocharge.vercel.app/producto/x", "x"),
    ).rejects.toThrow();
  });
});

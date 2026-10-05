import QRCode from "qrcode";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen del QR"));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Genera la imagen para compartir un producto: su foto en 1080x1080 con el
 * código QR de la URL del producto en la esquina inferior derecha, sobre un
 * fondo blanco redondeado para que se pueda escanear sin problemas.
 *
 * La foto se carga con `fetch` (CORS) y `createImageBitmap`, así el canvas
 * no queda "manchado" y `toBlob` funciona. Si algo falla, lanza excepción
 * para que el llamador use el plan B (foto original sin QR).
 */
export async function buildShareImage(
  imageUrl: string,
  productUrl: string,
  slug: string,
): Promise<File> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} al cargar la foto`);
  const bitmap = await createImageBitmap(await resp.blob());

  const qrDataUrl = await QRCode.toDataURL(productUrl, {
    width: 512,
    margin: 2,
    color: { dark: "#0a2540", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrDataUrl);

  const SIZE = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  // Fondo blanco y foto ajustada en modo "cover"
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

  // QR en la esquina inferior derecha con marco blanco redondeado
  const qrSize = 300;
  const margin = 36;
  const pad = 20;
  const x = SIZE - margin - qrSize;
  const y = SIZE - margin - qrSize;
  ctx.fillStyle = "#ffffff";
  // Sombra sutil para separarlo de la foto
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, x - pad, y - pad, qrSize + pad * 2, qrSize + pad * 2, 32);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(qrImg, x, y, qrSize, qrSize);

  const outBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!outBlob) throw new Error("No se pudo generar el JPEG");

  return new File([outBlob], `${slug}-neocharge.jpg`, { type: "image/jpeg" });
}

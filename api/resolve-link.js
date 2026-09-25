// Vercel Serverless Function: resuelve enlaces cortos de mapas (goo.gl,
// maps.app.goo.gl, etc.) siguiendo los redirects y devolviendo la URL final.
// La calculadora pública la usa cuando el cliente pega un enlace corto que
// no contiene las coordenadas directamente.

const ALLOWED_HOSTS = [
  "goo.gl",
  "maps.app.goo.gl",
  "maps.google.com",
  "google.com",
  "www.google.com",
  "maps.me",
];

function isAllowedHost(host) {
  const h = String(host || "").toLowerCase();
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith("." + a));
}

module.exports = async (req, res) => {
  const raw = req.query && req.query.url;
  if (!raw || typeof raw !== "string") {
    res.status(400).json({ error: "Falta el parámetro url" });
    return;
  }

  let target;
  try {
    target = new URL(raw);
  } catch {
    res.status(400).json({ error: "URL inválida" });
    return;
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    res.status(400).json({ error: "Solo se permiten URLs http(s)" });
    return;
  }

  if (!isAllowedHost(target.hostname)) {
    res.status(400).json({ error: "Host no permitido" });
    return;
  }

  try {
    const r = await fetch(target.toString(), { redirect: "follow" });
    res.status(200).json({ finalUrl: r.url });
  } catch (e) {
    res.status(500).json({ error: "No se pudo resolver el enlace" });
  }
};

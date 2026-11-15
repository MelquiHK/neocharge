// Vercel Serverless Function: actualización automática de las tasas de
// elTOQUE (USD y EUR) de la tienda NeoCharge.
//
// - GET (con secreto): lee las tasas vigentes de la página pública de
//   elTOQUE y las guarda vía la función RPC de Supabase
//   `update_exchange_rate`, que valida el secreto, los rangos y el
//   guardia de saltos (>20%) y preserva el extra de cargadores.
// - POST {usd, eur, source?} (con secreto): vía de respaldo con valores
//   ya leídos por otra vía.
// - Lo invoca Vercel Cron (Authorization: Bearer <CRON_SECRET>) tres
//   veces al día y el disparador local de Kenop (x-rate-secret).
//
// El secreto NUNCA va en el código: sale de las variables de entorno
// RATE_UPDATE_SECRET o CRON_SECRET.
//
// OJO: va como módulo ES (export default) porque el package.json del
// proyecto trae "type": "module"; con module.exports la función muere
// al arrancar (ese es el fallo que ya tenía api/resolve-link.js).

const ELTOQUE_URL = "https://eltoque.com/tasas-de-cambio-cuba";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://txkgchetianfvypnkziq.supabase.co";
// Llave pública (publishable) del proyecto: es la misma que ya viaja en
// el bundle público de la tienda y en .env.example; la escritura real la
// autoriza la RPC validando el secreto, no esta llave.
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_v_tNhI6VgA5oZh0RTV33lQ_-xfuc5Jd";

const RANGES = {
  usd: { min: 100, max: 3000 },
  eur: { min: 100, max: 3500 },
};

function getSecret() {
  return process.env.RATE_UPDATE_SECRET || process.env.CRON_SECRET || "";
}

function isAuthorized(req) {
  const expected = getSecret();
  if (!expected) return false;
  const auth = String((req.headers && req.headers.authorization) || "");
  if (auth === `Bearer ${expected}`) return true;
  const headerSecret = String(
    (req.headers && req.headers["x-rate-secret"]) || ""
  );
  return headerSecret === expected;
}

function inRange(kind, value) {
  const r = RANGES[kind];
  return Number.isFinite(value) && value >= r.min && value <= r.max;
}

function parseRate(text, currency) {
  const re = new RegExp(
    `1\\s*${currency}[^0-9]{0,60}?([0-9]{2,4}(?:[.,][0-9]{1,2})?)\\s*CUP`,
    "i"
  );
  const m = text.match(re);
  if (!m) return null;
  const value = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

async function fetchElToqueRates() {
  const r = await fetch(ELTOQUE_URL, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-ES,es;q=0.9",
    },
  });
  if (!r.ok) return null;
  const html = await r.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");
  const usd = parseRate(text, "USD");
  const eur = parseRate(text, "EUR");
  if (!inRange("usd", usd) || !inRange("eur", eur)) return null;
  return { usd, eur };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (req.body && typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function callRpc(usd, eur, source) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_exchange_rate`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_usd: usd,
      p_eur: eur,
      p_secret: getSecret(),
      p_source: source,
    }),
  });

  if (r.status === 404) {
    return { status: 200, payload: { ok: false, error: "rpc_missing" } };
  }

  let data = null;
  try {
    data = await r.json();
  } catch {
    data = null;
  }

  if (data && typeof data === "object" && "ok" in data) {
    return { status: 200, payload: data };
  }

  // La RPC puede señalar el guardia de saltos lanzando una excepción:
  // PostgREST la devuelve como {code, message} sin campo ok.
  const raw = JSON.stringify(data || {});
  if (/swing_guard/i.test(raw)) {
    return { status: 200, payload: { ok: false, error: "swing_guard" } };
  }
  return {
    status: 200,
    payload: {
      ok: false,
      error: "rpc_error",
      detail: raw.slice(0, 300),
      http_status: r.status,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!isAuthorized(req)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  let usd;
  let eur;
  let source;

  if (req.method === "GET") {
    let rates = null;
    try {
      rates = await fetchElToqueRates();
    } catch {
      rates = null;
    }
    if (!rates) {
      res.status(502).json({ ok: false, error: "source_unavailable" });
      return;
    }
    usd = rates.usd;
    eur = rates.eur;
    source = "vercel-api";
  } else if (req.method === "POST") {
    const body = await readJsonBody(req);
    usd = body ? Number(body.usd) : NaN;
    eur = body ? Number(body.eur) : NaN;
    if (!inRange("usd", usd) || !inRange("eur", eur)) {
      res.status(400).json({ ok: false, error: "invalid_values" });
      return;
    }
    source = "respaldo";
  } else {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  try {
    const { status, payload } = await callRpc(usd, eur, source);
    res.status(status).json({ ...payload, source, fetched: { usd, eur } });
  } catch (e) {
    res
      .status(502)
      .json({ ok: false, error: "rpc_unreachable", detail: String(e).slice(0, 200) });
  }
}

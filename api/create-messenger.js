// Vercel Serverless Function: alta y activación de cuentas de mensajero.
//
// La crea Mel desde el panel admin (sección Mensajería) para que un
// mensajero pueda entrar ENSEGUIDA a la app NeoCharge Mensajero con su
// correo y contraseña, sin pasar por el registro público de la tienda.
//
// Flujo (todo con la llave service_role, que vive SOLO en la variable de
// entorno SUPABASE_SERVICE_ROLE_KEY de Vercel):
//   1. Se valida el JWT de quien llama: debe ser admin u owner
//      (user_roles) o el correo owner de la tienda. Si no: 401/403.
//   2. action "create": crea el usuario en Supabase Auth (Admin API,
//      correo ya confirmado), su fila en profiles, su rol "mensajero"
//      en user_roles y su fila ACTIVA en messenger_profiles.
//   3. action "set_active": activa o desactiva un mensajero
//      (messenger_profiles.is_active). La app del mensajero no deja
//      entrar a quien no tenga la fila activa.
//
// OJO: módulo ES (export default) porque el package.json trae
// "type": "module"; con module.exports la función muere al arrancar.

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://txkgchetianfvypnkziq.supabase.co";
// Llave pública (publishable): la misma del bundle de la tienda; solo
// identifica el proyecto ante Auth, no autoriza nada por sí sola.
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_v_tNhI6VgA5oZh0RTV33lQ_-xfuc5Jd";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Mismo correo owner que reconoce el panel web (AuthContext.tsx).
const OWNER_EMAIL = "melcraft96@gmail.com";

const VEHICLE_TYPES = new Set(["car", "motorcycle", "bicycle"]);

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

function bearer(req) {
  const auth = String((req.headers && req.headers.authorization) || "");
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

async function sbFetch(path, { method = "GET", key, token, body, prefer } = {}) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${token || key}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  let data = null;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  return { status: r.status, data };
}

/** Devuelve { id, email } del dueño del JWT, o null si no es válido. */
async function getCaller(jwt) {
  if (!jwt) return null;
  const { status, data } = await sbFetch("/auth/v1/user", {
    key: SUPABASE_KEY,
    token: jwt,
  });
  if (status !== 200 || !data || !data.id) return null;
  return { id: data.id, email: String(data.email || "").toLowerCase() };
}

/** admin u owner en user_roles, o el correo owner de la tienda. */
async function isAdminOrOwner(caller) {
  if (caller.email && caller.email === OWNER_EMAIL) return true;
  const { status, data } = await sbFetch(
    `/rest/v1/user_roles?user_id=eq.${caller.id}&select=role`,
    { key: SERVICE_KEY },
  );
  if (status !== 200 || !Array.isArray(data)) return false;
  return data.some((r) => r.role === "admin" || r.role === "owner");
}

async function createMessenger(res, body) {
  const fullName = String(body.full_name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const vehicleType = VEHICLE_TYPES.has(body.vehicle_type)
    ? body.vehicle_type
    : "car";

  if (!fullName) {
    return res.status(400).json({ ok: false, error: "missing_name", message: "Falta el nombre del mensajero." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "invalid_email", message: "El correo no se ve válido." });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: "weak_password", message: "La contraseña debe tener al menos 8 caracteres." });
  }

  // 1) Usuario en Supabase Auth, ya confirmado (entra enseguida).
  const created = await sbFetch("/auth/v1/admin/users", {
    method: "POST",
    key: SERVICE_KEY,
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    },
  });
  if (created.status >= 300 || !created.data || !created.data.id) {
    const raw = JSON.stringify(created.data || {});
    if (/already|exists|registered/i.test(raw)) {
      return res.status(409).json({ ok: false, error: "email_exists", message: "Ya existe una cuenta con ese correo." });
    }
    return res.status(502).json({ ok: false, error: "auth_create_failed", message: "No se pudo crear la cuenta de acceso.", detail: raw.slice(0, 300) });
  }
  const userId = created.data.id;

  // Si un paso posterior falla, se borra el usuario recién creado para
  // no dejar cuentas a medias.
  const rollback = async () => {
    await sbFetch(`/auth/v1/admin/users/${userId}`, { method: "DELETE", key: SERVICE_KEY }).catch(() => {});
  };

  // 2) Perfil público (upsert: puede existir si un trigger ya lo creó).
  const profile = await sbFetch("/rest/v1/profiles", {
    method: "POST",
    key: SERVICE_KEY,
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { id: userId, full_name: fullName, phone: phone || null },
  });
  if (profile.status >= 300) {
    await rollback();
    return res.status(502).json({ ok: false, error: "profile_failed", message: "La cuenta se creó pero falló el perfil; se deshizo el cambio. Inténtalo de nuevo." });
  }

  // 3) Rol "mensajero" (para que el panel web también lo reconozca).
  const role = await sbFetch("/rest/v1/user_roles", {
    method: "POST",
    key: SERVICE_KEY,
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { user_id: userId, role: "mensajero" },
  });
  if (role.status >= 300) {
    await rollback();
    return res.status(502).json({ ok: false, error: "role_failed", message: "La cuenta se creó pero falló el rol; se deshizo el cambio. Inténtalo de nuevo." });
  }

  // 4) Perfil de mensajero ACTIVO: esto es lo que la app comprueba.
  const mp = await sbFetch("/rest/v1/messenger_profiles", {
    method: "POST",
    key: SERVICE_KEY,
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { user_id: userId, is_active: true, vehicle_type: vehicleType },
  });
  if (mp.status >= 300) {
    await rollback();
    return res.status(502).json({ ok: false, error: "messenger_profile_failed", message: "La cuenta se creó pero falló activarla como mensajero; se deshizo el cambio. Inténtalo de nuevo." });
  }

  return res.status(200).json({ ok: true, user_id: userId });
}

async function setActive(res, body) {
  const userId = String(body.user_id || "").trim();
  const isActive = body.is_active === true;
  if (!userId) {
    return res.status(400).json({ ok: false, error: "missing_user", message: "Falta el mensajero." });
  }
  const upd = await sbFetch(
    `/rest/v1/messenger_profiles?user_id=eq.${userId}`,
    {
      method: "PATCH",
      key: SERVICE_KEY,
      prefer: "return=representation",
      body: { is_active: isActive },
    },
  );
  if (upd.status >= 300) {
    return res.status(502).json({ ok: false, error: "update_failed", message: "No se pudo cambiar el estado del mensajero." });
  }
  const rows = Array.isArray(upd.data) ? upd.data : [];
  if (rows.length === 0) {
    if (!isActive) {
      return res.status(404).json({ ok: false, error: "not_a_messenger", message: "Esa cuenta no tiene perfil de mensajero." });
    }
    // No tenía fila: se crea ya activa.
    const ins = await sbFetch("/rest/v1/messenger_profiles", {
      method: "POST",
      key: SERVICE_KEY,
      prefer: "return=minimal",
      body: { user_id: userId, is_active: true },
    });
    if (ins.status >= 300) {
      return res.status(502).json({ ok: false, error: "update_failed", message: "No se pudo activar al mensajero." });
    }
  }
  return res.status(200).json({ ok: true, user_id: userId, is_active: isActive });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  if (!SERVICE_KEY) {
    return res.status(500).json({ ok: false, error: "server_misconfigured", message: "Falta configurar la llave del servidor." });
  }

  const caller = await getCaller(bearer(req));
  if (!caller) {
    return res.status(401).json({ ok: false, error: "unauthorized", message: "Tu sesión no es válida. Entra de nuevo." });
  }
  if (!(await isAdminOrOwner(caller))) {
    return res.status(403).json({ ok: false, error: "forbidden", message: "Solo un administrador puede hacer esto." });
  }

  const body = (await readJsonBody(req)) || {};
  try {
    if (body.action === "create") return await createMessenger(res, body);
    if (body.action === "set_active") return await setActive(res, body);
    return res.status(400).json({ ok: false, error: "unknown_action", message: "Acción no reconocida." });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "upstream_unreachable", detail: String(e).slice(0, 200) });
  }
}

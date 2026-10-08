/**
 * Exporta los datos públicos de la tienda a public/offline-seed.json.
 *
 * Esta "semilla" se empaqueta DENTRO del APK: al instalar la app, aunque el
 * cliente nunca haya tenido internet, los productos, categorías, tasa,
 * servicios y posts del blog ya están guardados en el teléfono como una
 * base de datos local inicial. Cuando hay internet, los datos frescos
 * reemplazan a la semilla automáticamente.
 *
 * Uso: node scripts/export-offline-seed.mjs
 * (lee VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY de .env)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error("Falta VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env");
  process.exit(1);
}

async function get(table, select, params = "") {
  const qs = new URLSearchParams({ select, ...Object.fromEntries(new URLSearchParams(params)) });
  const res = await fetch(`${URL}/rest/v1/${table}?${qs}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

const seed = { exportedAt: new Date().toISOString(), data: {} };

// Productos activos (mismo select que la tienda)
seed.data.products_v1 = await get(
  "products",
  "id,name,slug,description,price,compare_price,images,main_image_index,stock,is_featured,category_id,currency,price_cup,extra_cup_per_usd,warranty_type,created_at,sort_order",
  "is_active=eq.true&order=created_at.desc"
);
// Destacados
seed.data.featured_v1 = seed.data.products_v1.filter((p) => p.is_featured).slice(0, 8);
// Categorías
seed.data.categories_v1 = await get("categories", "id,name,slug", "order=sort_order");
// Tasa de cambio (la más reciente)
const rates = await get("exchange_rates", "usd_to_cup,extra_cup_chargers,rate_date", "order=rate_date.desc&limit=1");
seed.data.exchange_rate_v1 = rates[0] ?? null;
// Servicios activos
try {
  seed.data.services_v1 = await get("services", "*", "is_active=eq.true&order=sort_order");
} catch (e) {
  console.warn("services:", e.message);
  seed.data.services_v1 = [];
}
// Posts del blog publicados
try {
  seed.data.blog_v1 = await get("blog_posts", "id,title,slug,excerpt,image_url,images,created_at", "is_published=eq.true&order=created_at.desc&limit=20");
} catch (e) {
  console.warn("blog_posts:", e.message);
  seed.data.blog_v1 = [];
}

const out = join(root, "public", "offline-seed.json");
writeFileSync(out, JSON.stringify(seed));
const kb = Math.round(Buffer.byteLength(JSON.stringify(seed)) / 1024);
console.log(`Semilla escrita en public/offline-seed.json (${kb} KB):`,
  `${seed.data.products_v1.length} productos,`,
  `${seed.data.categories_v1.length} categorías,`,
  `${seed.data.services_v1.length} servicios,`,
  `${seed.data.blog_v1.length} posts.`);

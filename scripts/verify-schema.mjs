/**
 * Show which tables PostgREST actually exposes.
 *
 *   node scripts/verify-schema.mjs
 *
 * WHY THIS SHAPE
 * The obvious check — a `head: true` count against each table — returns
 * no error for a table that does NOT exist, which once produced a false
 * "all present" reading. Reading the OpenAPI spec's paths is the honest
 * version: a table absent from `spec.paths` is genuinely not there.
 *
 * Enums and functions are invisible here until a column or a route uses
 * them, so a chunk that only creates a type shows up as no change. That
 * is a limit of this check, not a failure of the migration.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEnv(name) {
  const file = join(root, ".env.local");
  if (!existsSync(file)) return null;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1 || line.slice(0, eq).trim() !== name) continue;
    return line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local.");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (!res.ok) {
  console.error(`PostgREST returned ${res.status}. Check the service-role key.`);
  process.exit(1);
}

const spec = await res.json();
const present = new Set(
  Object.keys(spec.paths ?? {})
    .filter((p) => p.startsWith("/") && p.length > 1)
    .map((p) => p.slice(1)),
);

const EXPECTED = {
  "from 0001 / 0002": ["leads", "admins", "applications", "application_events", "access_tokens", "application_feedback"],
  "0003 — the shop": [
    "shop_categories", "products", "product_variants", "product_images",
    "product_specs", "orders", "order_items", "order_events",
    "download_grants", "order_tokens",
  ],
};

let missing = 0;

for (const [group, tables] of Object.entries(EXPECTED)) {
  console.log(`\n${group}`);
  for (const t of tables) {
    const ok = present.has(t);
    if (!ok) missing += 1;
    console.log(`  ${ok ? "✓" : "·"} ${t}`);
  }
}

const shopTables = EXPECTED["0003 — the shop"];
const shopPresent = shopTables.filter((t) => present.has(t)).length;

console.log(`\nShop tables: ${shopPresent}/${shopTables.length}`);
console.log(missing === 0 ? "Everything expected is exposed.\n" : `${missing} not exposed yet.\n`);

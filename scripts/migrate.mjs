/**
 * Run a migration straight against Postgres.
 *
 *   node scripts/migrate.mjs 0003          # run every chunk, in order
 *   node scripts/migrate.mjs 0003 --from 5 # resume from chunk 5
 *   node scripts/migrate.mjs 0003 --dry    # show what would run
 *
 * WHY THIS EXISTS
 * Migrations were being pasted into the dashboard's SQL Editor a chunk
 * at a time, because a large paste silently fails to land there. That
 * was already slow; it became untenable when the editor started
 * swallowing keystrokes and prepending stray characters to the SQL.
 *
 * This connects directly instead. Same file, same chunks, no clipboard —
 * so nothing can truncate, reorder or corrupt what actually reaches the
 * database. Every chunk is idempotent, so a re-run is safe.
 *
 * Needs DATABASE_URL in .env.local (Supabase dashboard → Project
 * Settings → Database → Connection string). It is read from the file
 * rather than passed as an argument so the password never lands in a
 * shell history or a terminal transcript.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env reader — no dependency, and it only needs one key. */
function readEnv(name) {
  const file = join(root, ".env.local");
  if (!existsSync(file)) return null;

  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== name) continue;

    // Strip surrounding quotes; a pasted connection string often has them.
    return line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const [, , prefix, ...rest] = process.argv;

if (!prefix) {
  console.error("Usage: node scripts/migrate.mjs <prefix> [--from N] [--dry]");
  process.exit(1);
}

const dry = rest.includes("--dry");
const fromIndex = rest.indexOf("--from");
const from = fromIndex === -1 ? 1 : Number(rest[fromIndex + 1] ?? 1);

const migrationsDir = join(root, "supabase", "migrations");
const file = readdirSync(migrationsDir).find((f) => f.startsWith(prefix));

if (!file) {
  console.error(`No migration starting with "${prefix}".`);
  process.exit(1);
}

const sql = readFileSync(join(migrationsDir, file), "utf8");

const chunks = sql
  .split(/^-- ===== CHUNK /m)
  .slice(1)
  .map((part) => {
    const nl = part.indexOf("\n");
    return {
      heading: part.slice(0, nl).replace(/=+\s*$/, "").trim(),
      body: part.slice(nl + 1).trim(),
    };
  });

if (chunks.length === 0) {
  console.error(`${file} has no "-- ===== CHUNK n" markers.`);
  process.exit(1);
}

console.log(`\n${file} — ${chunks.length} chunks\n`);

if (dry) {
  chunks.forEach((c, i) =>
    console.log(`  ${String(i + 1).padStart(2)}. ${c.heading}  (${c.body.split("\n").length} lines)`),
  );
  process.exit(0);
}

const connectionString = readEnv("DATABASE_URL");

if (!connectionString) {
  console.error(
    [
      "DATABASE_URL is not in .env.local.",
      "",
      "Supabase dashboard → Project Settings → Database → Connection string.",
      "Take the Session pooler (or Direct) URI and add it as:",
      "",
      "  DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:<port>/postgres",
      "",
      "Put it in the file rather than on the command line, so the password",
      "does not end up in your shell history.",
    ].join("\n"),
  );
  process.exit(1);
}

// Supabase terminates TLS with a certificate this client has no root for.
// The connection is still encrypted; only the certificate chain is
// unverified, which is the same posture the dashboard's own SQL editor
// gives you and is acceptable for applying a migration from a laptop.
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (error) {
  console.error(`Could not connect: ${error.message}`);
  if (/password authentication failed/i.test(error.message)) {
    console.error("\nThe password in DATABASE_URL looks wrong. Reset it in the dashboard if needed.");
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(error.message)) {
    console.error("\nThe host could not be resolved — check the string was copied whole.");
  }
  process.exit(1);
}

let failed = null;

for (const [index, chunk] of chunks.entries()) {
  const n = index + 1;
  if (n < from) {
    console.log(`  ·  ${String(n).padStart(2)}. ${chunk.heading} — skipped`);
    continue;
  }

  try {
    const result = await client.query(chunk.body);

    // The last chunk is a verification SELECT; show what it found rather
    // than reporting "ok" and leaving the reader to go and look.
    const rows = Array.isArray(result) ? result.at(-1)?.rows : result.rows;

    if (rows && rows.length > 0) {
      console.log(`  ✓  ${String(n).padStart(2)}. ${chunk.heading}`);
      for (const row of rows) {
        console.log(`        ${Object.values(row).join("  —  ")}`);
      }
    } else {
      console.log(`  ✓  ${String(n).padStart(2)}. ${chunk.heading}`);
    }
  } catch (error) {
    console.error(`  ✗  ${String(n).padStart(2)}. ${chunk.heading}`);
    console.error(`        ${error.message}`);
    if (error.hint) console.error(`        hint: ${error.hint}`);
    failed = n;
    break;
  }
}

await client.end();

if (failed) {
  console.error(
    `\nStopped at chunk ${failed}. Fix it, then resume:\n  node scripts/migrate.mjs ${prefix} --from ${failed}\n`,
  );
  process.exit(1);
}

console.log("\nAll chunks applied.\n");

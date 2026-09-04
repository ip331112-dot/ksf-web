/**
 * Put one chunk of a migration on the Windows clipboard.
 *
 *   node scripts/migrate-chunk.mjs 0003        # list the chunks
 *   node scripts/migrate-chunk.mjs 0003 1      # copy chunk 1
 *   node scripts/migrate-chunk.mjs 0003 next   # copy the one after the last
 *
 * WHY THIS EXISTS
 * Claude's Supabase tooling is authenticated against a different account
 * and cannot reach this project, so every migration is pasted by hand
 * into the dashboard's SQL Editor. A ~200 line paste silently fails to
 * land in that editor — it looks like it worked and nothing runs. 0002
 * cost a long detour before it was split. So migrations are written in
 * chunks marked `-- ===== CHUNK n`, and this copies them one at a time.
 *
 * Progress is remembered in .migrate-chunk-state.json so `next` works
 * across runs. That file is disposable; delete it to start over.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const stateFile = join(root, ".migrate-chunk-state.json");

const [, , prefix, which] = process.argv;

if (!prefix) {
  console.error("Usage: node scripts/migrate-chunk.mjs <prefix> [n|next]");
  console.error("  e.g. node scripts/migrate-chunk.mjs 0003 1");
  process.exit(1);
}

const file = readdirSync(migrationsDir).find((f) => f.startsWith(prefix));
if (!file) {
  console.error(`No migration starting with "${prefix}" in supabase/migrations.`);
  process.exit(1);
}

const sql = readFileSync(join(migrationsDir, file), "utf8");

/**
 * Split on the chunk markers, keeping each marker with the SQL beneath it.
 * Anything before the first marker is the file header — never a chunk.
 */
const parts = sql.split(/^-- ===== CHUNK /m).slice(1);
const chunks = parts.map((part) => {
  const newline = part.indexOf("\n");
  const heading = part.slice(0, newline).replace(/=+\s*$/, "").trim();
  return { heading, body: part.slice(newline + 1).trim() };
});

if (chunks.length === 0) {
  console.error(`${file} has no "-- ===== CHUNK n" markers.`);
  process.exit(1);
}

const readState = () => {
  try {
    return JSON.parse(readFileSync(stateFile, "utf8"));
  } catch {
    return {};
  }
};

if (!which) {
  const done = readState()[file] ?? 0;
  console.log(`\n${file} — ${chunks.length} chunks\n`);
  chunks.forEach((c, i) => {
    const n = i + 1;
    const lines = c.body.split("\n").length;
    console.log(`  ${n <= done ? "✓" : " "} ${String(n).padStart(2)}. ${c.heading}  (${lines} lines)`);
  });
  console.log(
    done
      ? `\nLast copied: ${done}. Next: node scripts/migrate-chunk.mjs ${prefix} next\n`
      : `\nStart with: node scripts/migrate-chunk.mjs ${prefix} 1\n`,
  );
  process.exit(0);
}

const state = readState();
const index = which === "next" ? (state[file] ?? 0) + 1 : Number(which);

if (!Number.isInteger(index) || index < 1 || index > chunks.length) {
  console.error(`Chunk must be between 1 and ${chunks.length}; got "${which}".`);
  process.exit(1);
}

const chunk = chunks[index - 1];

/**
 * clip.exe, fed UTF-16LE with a byte-order mark.
 *
 * READ BEFORE CHANGING THIS. Piping a UTF-8 buffer here looks like it
 * works and silently corrupts every non-ASCII character: clip.exe reads
 * stdin in the console's OEM codepage, so "é" (0xC3 0xA9) arrives as two
 * box-drawing characters. That is not theoretical — it shipped
 * "Packs matériel" into the database as "Packs mat├⌐riel", and the
 * migration reported success the whole way because mangled text is still
 * valid SQL inside quotes.
 *
 * The BOM is what tells clip.exe to read UTF-16 rather than guessing.
 */
try {
  execFileSync("clip.exe", { input: Buffer.from("﻿" + chunk.body, "utf16le") });
} catch {
  console.error("Could not reach clip.exe — printing instead.\n");
  console.log(chunk.body);
}

// Warn when a chunk carries text that the clipboard path could mangle,
// so a bad paste is caught by eye rather than found in production.
const nonAscii = [...new Set(chunk.body.match(/[^\x00-\x7F]/g) ?? [])];
if (nonAscii.length > 0) {
  console.log(`\nThis chunk contains non-ASCII characters: ${nonAscii.join(" ")}`);
  console.log("Check they survived the paste before running it.");
}

state[file] = index;
writeFileSync(stateFile, JSON.stringify(state, null, 2));

console.log(`\nCopied chunk ${index}/${chunks.length} — ${chunk.heading}`);
console.log(`${chunk.body.split("\n").length} lines on the clipboard.\n`);
console.log("Paste into the SQL Editor, Run, then:");
console.log(
  index < chunks.length
    ? `  node scripts/migrate-chunk.mjs ${prefix} next\n`
    : "  that was the last chunk — check the verify output.\n",
);

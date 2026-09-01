// Finds English text still showing on French pages.
//
// Translation gaps do not throw — they render. A page can be fully
// "working" and still be half in the wrong language, and nothing in the
// typechecker, the linter or the smoke test notices. This walks every
// French route, strips the markup, and scores each block of visible text
// for English function words that have no French equivalent spelling.
//
// It reports blocks, not words, so the output says which sentence to go
// and translate rather than that some English exists somewhere.
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";

const slugs = (file) =>
  [...readFileSync(file, "utf8").matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

const trackSlugs = slugs("src/content/tracks.ts");
const serviceSlugs = slugs("src/content/site.ts");

const paths = [
  "",
  "/tracks",
  ...trackSlugs.map((s) => `/tracks/${s}`),
  ...trackSlugs.map((s) => `/tracks/${s}/apply`),
  "/services",
  ...serviceSlugs.map((s) => `/services/${s}`),
  "/pricing",
  "/about",
  "/faq",
  "/contact",
  "/terms",
  "/privacy",
  "/refunds",
  "/cookies",
  "/apply/success?ref=KSF-2026-0000",
];

/**
 * Words that are unambiguously English here. Deliberately excludes
 * anything that is also French ("on", "par", "sur"), a brand name, or a
 * technical term the French copy would keep anyway.
 */
const EN = new Set(
  ("the and you your with for we our are this that from will have not what how "
   + "who every each about their there they them then than been being would could "
   + "should when where which while because before after between into through "
   + "over under again more most other some such only own same very just also "
   + "here" ).split(/\s+/),
);

/** Strip scripts, styles and tags; keep the words a reader sees. */
function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&[a-z]+;/gi, " ");
}

let totalBlocks = 0;
const findings = [];

for (const p of paths) {
  const url = `${BASE}/fr${p}`;
  const html = await fetch(url).then((r) => r.text());

  const blocks = visibleText(html)
    .split("\n")
    .map((b) => b.trim())
    .filter((b) => b.length > 25);

  const seen = new Set();
  for (const b of blocks) {
    const words = b.toLowerCase().match(/[a-zà-ÿ']+/g) ?? [];
    if (words.length < 5) continue;
    const hits = words.filter((w) => EN.has(w));
    // Two or more English-only function words in one block is not an
    // accident of shared vocabulary.
    if (hits.length >= 2 && !seen.has(b)) {
      seen.add(b);
      findings.push({ path: `/fr${p}`, hits: hits.length, text: b });
    }
    totalBlocks++;
  }
}

// Group: the same string on many pages is one job, not thirty.
const byText = new Map();
for (const f of findings) {
  const e = byText.get(f.text) ?? { text: f.text, hits: f.hits, paths: [] };
  e.paths.push(f.path);
  byText.set(f.text, e);
}

const grouped = [...byText.values()].sort((a, b) => b.paths.length - a.paths.length);

console.log(`Scanned ${paths.length} French pages, ${totalBlocks} text blocks.\n`);
console.log(`${grouped.length} distinct English string(s) still showing:\n`);

for (const g of grouped) {
  const where =
    g.paths.length > 3
      ? `${g.paths.length} pages (${g.paths.slice(0, 2).join(", ")}, …)`
      : g.paths.join(", ");
  console.log(`[${where}]`);
  console.log(`  ${g.text.slice(0, 150)}${g.text.length > 150 ? "…" : ""}\n`);
}

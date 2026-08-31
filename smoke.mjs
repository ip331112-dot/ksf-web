// Smoke test: every route responds 200 in every language, renders its
// expected marker, and contains no obviously broken internal links.
//
// Both locales are walked separately rather than trusting that /fr works
// because /en does — the whole point of the locale segment is that the
// two render different trees, and a missing French dictionary key throws
// at render time on one and not the other.
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";

const slugs = (file) =>
  [...readFileSync(file, "utf8").matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

const trackSlugs = slugs("src/content/tracks.ts");
const serviceSlugs = [
  ...readFileSync("src/content/site.ts", "utf8").matchAll(/slug:\s*"([^"]+)"/g),
].map((m) => m[1]);

const LOCALES = ["en", "fr"];

// ---------------------------------------------------------------------
// Dictionaries, before anything is fetched.
//
// A key present in one language and missing from the other throws at
// render time, and only on the page that reads it — which may be a page
// nothing here visits. Comparing the files catches it in a second.
// Placeholders are compared too: a French string that drops {price}
// renders a sentence with a hole in it, and nothing else would notice.
// ---------------------------------------------------------------------
console.log("=== DICTIONARIES ===");
{
  const load = (l) =>
    JSON.parse(readFileSync(`src/lib/i18n/dictionaries/${l}.json`, "utf8"));

  const flatten = (o, p = "") =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === "object" ? flatten(v, `${p}${k}.`) : [[`${p}${k}`, v]],
    );

  const placeholders = (s) =>
    [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

  const [base, ...rest] = LOCALES;
  const baseEntries = flatten(load(base));
  const baseKeys = baseEntries.map(([k]) => k);
  let problems = 0;

  for (const locale of rest) {
    const other = Object.fromEntries(flatten(load(locale)));
    const otherKeys = Object.keys(other);

    for (const k of baseKeys) {
      if (!(k in other)) {
        console.log(`MISSING  ${locale}: ${k}`);
        problems++;
      } else if (placeholders(other[k]) !== placeholders(
        baseEntries.find(([bk]) => bk === k)[1],
      )) {
        console.log(`PLACEHOLDER  ${k}: ${base} vs ${locale} disagree`);
        problems++;
      }
    }
    for (const k of otherKeys) {
      if (!baseKeys.includes(k)) {
        console.log(`EXTRA    ${locale}: ${k}`);
        problems++;
      }
    }
  }

  console.log(
    problems === 0
      ? `PASS  ${baseKeys.length} keys match across ${LOCALES.join(", ")}`
      : `FAIL  ${problems} dictionary problem(s)`,
  );
  if (problems) process.exitCode = 1;
}
console.log();

const paths = [
  "",
  "/tracks",
  ...trackSlugs.map((s) => `/tracks/${s}`),
  "/services",
  ...serviceSlugs.map((s) => `/services/${s}`),
  "/contact",
  "/pricing",
  "/about",
  "/faq",
  // The apply flow. The success page is reached with a reference, the
  // way the flow actually leaves you there; /status needs a live token
  // and so cannot be walked from here.
  ...trackSlugs.map((s) => `/tracks/${s}/apply`),
  "/apply/success?ref=KSF-2026-0000",
];

const routes = LOCALES.flatMap((l) => paths.map((p) => `/${l}${p}`));

// The unprefixed root must redirect rather than 404 — it is what every
// existing link and bookmark points at.
console.log("=== LOCALE REDIRECT ===");
for (const p of ["/", "/tracks", "/contact"]) {
  const res = await fetch(BASE + p, { redirect: "manual" });
  const to = res.headers.get("location");
  const ok =
    res.status >= 300 && res.status < 400 && /^\/(en|fr)/.test(to ?? "");
  console.log(`${ok ? "PASS" : "FAIL"}  ${res.status} ${p} -> ${to}`);
  if (!ok) process.exitCode = 1;
}
console.log();

let pass = 0;
let fail = 0;
const links = new Set();

for (const r of routes) {
  let status, html = "";
  try {
    const res = await fetch(BASE + r);
    status = res.status;
    html = await res.text();
  } catch (e) {
    status = `ERR ${e.message}`;
  }

  const hasH1 = /<h1[\s>]/.test(html);

  // The apply flow and its confirmation are deliberately chrome-free:
  // the layout calls for a logo and nothing else, because every link in
  // a full nav is an invitation to abandon a half-finished application.
  // Requiring a footer there would fail them for behaving as designed.
  const wantsFooter = !/\/(apply|tracks\/[^/]+\/apply)/.test(r);
  const hasFooter = !wantsFooter || /<footer[\s>]/.test(html);

  // The page must declare the language it is actually in. Getting this
  // wrong is invisible on screen but tells a screen reader to pronounce
  // French with English phonetics.
  const expected = r.startsWith("/fr") ? "fr-FR" : "en-GB";
  const langOk = new RegExp(`<html[^>]+lang="${expected}"`).test(html);

  // An unreplaced {placeholder} in the visible markup means a dictionary
  // string reached the page without its values filled in. Script blocks
  // are stripped first: a template like "within {responseTime}" is
  // supposed to appear verbatim in the hydration payload for a client
  // component, which fills it at render.
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const noHoles =
    !/\{(price|email|responseTime|minutes|max|track|coverage)\}/.test(visible);

  const ok = status === 200 && hasH1 && hasFooter && langOk && noHoles;
  ok ? pass++ : fail++;

  console.log(
    `${ok ? "PASS" : "FAIL"}  ${String(status).padEnd(4)} ${r}` +
      (ok ? "" : `   [h1:${hasH1} footer:${hasFooter} lang:${langOk} noHoles:${noHoles}]`),
  );

  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) links.add(m[1]);
}

// Every internal link discovered must itself resolve
console.log("\n=== INTERNAL LINKS ===");
let dead = 0;
for (const href of [...links].sort()) {
  if (href.startsWith("/_next")) continue;
  const res = await fetch(BASE + href, { redirect: "manual" });
  if (res.status >= 400) {
    console.log(`DEAD ${res.status}  ${href}`);
    dead++;
  }
}
console.log(dead === 0 ? `all ${links.size} internal links resolve` : `${dead} dead link(s)`);
console.log(`\nRoutes: ${pass} passed, ${fail} failed`);
process.exit(fail + dead === 0 ? 0 : 1);

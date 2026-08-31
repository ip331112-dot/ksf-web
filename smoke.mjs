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
  const hasFooter = /<footer[\s>]/.test(html);

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

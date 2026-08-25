// Smoke test: every route responds 200, renders its expected marker,
// and contains no obviously broken internal links.
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";

const slugs = (file) =>
  [...readFileSync(file, "utf8").matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

const trackSlugs = slugs("src/content/tracks.ts");
const serviceSlugs = [
  ...readFileSync("src/content/site.ts", "utf8").matchAll(/slug:\s*"([^"]+)"/g),
].map((m) => m[1]);

const routes = [
  "/",
  "/tracks",
  ...trackSlugs.map((s) => `/tracks/${s}`),
  "/services",
  ...serviceSlugs.map((s) => `/services/${s}`),
];

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
  const ok = status === 200 && hasH1 && hasFooter;
  ok ? pass++ : fail++;

  console.log(
    `${ok ? "PASS" : "FAIL"}  ${String(status).padEnd(4)} ${r}` +
      (ok ? "" : `   [h1:${hasH1} footer:${hasFooter}]`),
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

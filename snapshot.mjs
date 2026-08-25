// Builds a standalone, self-contained HTML snapshot of a rendered route
// so the site can be viewed without running the dev server.
// Usage: node snapshot.mjs <path> <outFile> <title>

const [, , route = "/", out = "snapshot.html", title = "KSF Preview"] = process.argv;
const BASE = "http://localhost:3000";

const html = await (await fetch(BASE + route)).text();

// Collect and inline every stylesheet Next emitted
const cssHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
  (m) => m[1],
);
let css = "";
for (const href of cssHrefs) {
  const url = href.startsWith("http") ? href : BASE + href;
  css += await (await fetch(url)).text();
  css += "\n";
}

// Body content only — the artifact host supplies the document shell
let body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "";

// Strip anything that needs a runtime: scripts, dev overlay, preload hints
body = body
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<nextjs-portal[\s\S]*?<\/nextjs-portal>/gi, "")
  .replace(/<next-route-announcer[\s\S]*?<\/next-route-announcer>/gi, "")
  .replace(/<template[\s\S]*?<\/template>/gi, "");

// next/font self-hosts woff2 under /_next which will not resolve off-server.
// Point the same three families at Google Fonts instead.
const fontFix = `
:root, body {
  --font-archivo: "Archivo";
  --font-plex-sans: "IBM Plex Sans";
  --font-plex-mono: "IBM Plex Mono";
}
`;

const doc = `<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
${css}
${fontFix}
</style>
${body}
`;

await (await import("node:fs/promises")).writeFile(out, doc, "utf8");
console.log(`${out}: ${(doc.length / 1024).toFixed(0)}KB, ${cssHrefs.length} stylesheet(s) inlined`);

/**
 * Say whether the configured Turnstile keys will actually protect the site.
 *
 *   node scripts/verify-turnstile.mjs
 *   node scripts/verify-turnstile.mjs --file .env.production
 *
 * WHY THIS SHAPE
 * "The keys are set" is not the question. There are three ways to have a
 * site key and a secret key present and still be unprotected, and only
 * one of them is visible by reading the file:
 *
 *   1. The secret is wrong or belongs to a deleted widget. Cloudflare
 *      rejects every submission and enquiries fail for everyone.
 *   2. The keys are Cloudflare's public TEST pair. Every token is
 *      accepted, so the widget renders and protects nothing. This is the
 *      dangerous one — the site looks correct in every way.
 *   3. Site key and secret are from different widgets. Tokens minted by
 *      one are refused by the other.
 *
 * So this asks Cloudflare directly, using a deliberately junk token. A
 * LIVE secret answers `invalid-input-response` — it rejected the token,
 * which is the proof we want, because a secret that Cloudflare does not
 * recognise answers `invalid-input-secret` instead. The two replies are
 * what separates "working" from "broken", and neither needs a real
 * browser token.
 *
 * Exit code is 1 when the configuration would leave production
 * unprotected or broken, so this can gate a deploy.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const fileArg = process.argv.indexOf("--file");
const envName = fileArg !== -1 ? process.argv[fileArg + 1] : ".env.local";

function readEnv(name) {
  const file = join(root, envName);
  if (!existsSync(file)) return null;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1 || line.slice(0, eq).trim() !== name) continue;
    return line.slice(eq + 1).trim().replace(/^["']|["']$/g, "") || null;
  }
  return null;
}

// Cloudflare's published dummy keys. They work on any domain and are
// invaluable locally; deploying them is strictly worse than running with
// no Turnstile at all, because ENQUIRIES_WITHOUT_TURNSTILE at least logs
// a warning saying the site is unprotected.
const TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
]);
const TEST_SECRET_KEYS = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

const site = readEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
const secret = readEnv("TURNSTILE_SECRET_KEY");
const hatch = readEnv("ENQUIRIES_WITHOUT_TURNSTILE");

console.log(`\nReading ${envName}\n`);

if (!existsSync(join(root, envName))) {
  console.error(`${envName} does not exist.\n`);
  process.exit(1);
}

console.log(`  ${site ? "✓" : "·"} NEXT_PUBLIC_TURNSTILE_SITE_KEY  ${site ? "set" : "empty"}`);
console.log(`  ${secret ? "✓" : "·"} TURNSTILE_SECRET_KEY            ${secret ? "set" : "empty"}`);
console.log(`  ${hatch === "true" ? "!" : "·"} ENQUIRIES_WITHOUT_TURNSTILE     ${hatch || "empty"}`);

// ---------------------------------------------------------------------
// Neither key set.
// ---------------------------------------------------------------------
if (!site && !secret) {
  if (hatch === "true") {
    console.log(
      "\nNo Turnstile, escape hatch ON.\n" +
        "Enquiries are accepted in production with no bot challenge. The\n" +
        "honeypot and the 3-per-10-minutes rate limit still apply. This is a\n" +
        "deliberate launch state, not a finished one.\n",
    );
    process.exit(0);
  }
  console.error(
    "\nNo Turnstile, escape hatch OFF.\n" +
      "A production build REFUSES EVERY ENQUIRY in this state. Add real keys,\n" +
      "or set ENQUIRIES_WITHOUT_TURNSTILE=true knowingly.\n",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------
// One key without the other. isTurnstileConfigured() needs both, so a
// lone site key renders a widget whose token is never checked.
// ---------------------------------------------------------------------
if (!site || !secret) {
  console.error(
    `\nOnly ${site ? "the site key" : "the secret key"} is set.\n` +
      "The app treats Turnstile as configured only when BOTH are present, so\n" +
      "this is the same as having none — with the added confusion of a\n" +
      "half-rendered widget.\n",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------
// Test keys.
// ---------------------------------------------------------------------
const siteIsTest = TEST_SITE_KEYS.has(site);
const secretIsTest = TEST_SECRET_KEYS.has(secret);

if (siteIsTest || secretIsTest) {
  const where = envName.includes("production") ? "PRODUCTION FILE" : "this file";
  console.log(
    `\nTEST KEYS in ${where}.\n` +
      `  site key   ${siteIsTest ? "test" : "real"}\n` +
      `  secret key ${secretIsTest ? "test" : "real"}\n\n` +
      "Cloudflare's dummy pair accepts every token. Correct for local\n" +
      "development, unprotected in production.\n",
  );
  process.exit(envName.includes("production") ? 1 : 0);
}

// ---------------------------------------------------------------------
// Real keys — ask Cloudflare whether the secret is one it knows.
// ---------------------------------------------------------------------
console.log("\nAsking Cloudflare about the secret key…");

let data;
try {
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret,
        response: "verify-turnstile-probe-not-a-real-token",
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  data = await res.json();
} catch {
  console.error(
    "\nCould not reach Cloudflare. This checks the network, not your keys —\n" +
      "run it again before concluding anything.\n",
  );
  process.exit(1);
}

const codes = data["error-codes"] ?? [];

if (codes.includes("invalid-input-secret") || codes.includes("bad-request")) {
  console.error(
    `\nCloudflare does not recognise this secret  (${codes.join(", ")})\n` +
      "Every enquiry would fail. Check it was copied whole, and that the\n" +
      "widget still exists in the Cloudflare dashboard.\n",
  );
  process.exit(1);
}

if (codes.includes("invalid-input-response") || codes.includes("missing-input-response")) {
  console.log(
    "\n  ✓ Secret is live — Cloudflare accepted it and rejected the junk token.\n\n" +
      "That is the correct answer, and it is as far as this check can go: the\n" +
      "site key can only be proven against the secret by a real browser token.\n" +
      "Load /en/contact, confirm the widget appears, and send one enquiry.\n" +
      "If site key and secret came from different widgets, that submission —\n" +
      "and only that submission — will reveal it.\n",
  );
  process.exit(0);
}

console.log(
  `\nUnexpected reply from Cloudflare: ${JSON.stringify(data)}\n` +
    "Not necessarily broken, but not a clean pass either. Worth a look\n" +
    "before deploying.\n",
);
process.exit(1);

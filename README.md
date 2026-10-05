# KSF Tech Services

The website and application platform for [ksftechservices.com](https://ksftechservices.com) — certification training and cyber security services. Candidates prepare for CompTIA, Cisco and EC-Council exams with mentored support from £10 a month.

It is a live, production site: a bilingual marketing front end, an application flow with status tracking, an admin decision panel, and a shop that invoices by bank transfer or Stripe.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + RLS) · Zod · Resend · Cloudflare Turnstile · Stripe · deployed on Vercel

---

## What it does

**Bilingual by routing, not by bolt-on.** Every page lives under `/[lang]`, English and French. The language switcher stays on the current page rather than dumping you at the homepage, canonical and `hreflang` alternates are generated per route, and page titles and descriptions are translated alongside the body copy.

**An application flow that survives being abandoned.** Candidates apply, receive a status link, and can return to it later. Staff review and decide from an admin panel; the applicant is emailed on a decision.

**A shop with two payment paths.** Cart, checkout, orders, and downloadable deliverables behind single-use tokens. Bank transfer covers UK (sort code) and French (IBAN/BIC) buyers; Stripe covers the rest.

**Layered spam defence.** Cloudflare Turnstile, a honeypot field, and a three-submissions-per-ten-minutes rate limit keyed on a salted hash of the IP — the raw address is never stored.

---

## The design rule worth knowing

**Every integration degrades honestly rather than failing silently.**

When a service isn't configured, the feature says so instead of pretending or breaking:

- No `SUPABASE_SERVICE_ROLE_KEY` → the enquiry forms render a "not live yet" state rather than accepting a message they couldn't store.
- No `RESEND_API_KEY` → the apply success page tells the candidate their status link exists only on that page, and the admin panel warns staff that the applicant was **not** emailed. Nothing crashes; a human is simply told to follow up.
- No bank details → the invoice email states that payment details are coming. The order is still recorded; it just can't be settled yet.

The inverse holds where safety requires it: a **production** build with no Turnstile keys refuses every enquiry outright, so bot protection cannot be lost by accident. Development is unaffected. There is a deliberate escape hatch, `ENQUIRIES_WITHOUT_TURNSTILE`, for launching before the Cloudflare account exists — it is loud about what it disables.

`.env.example` documents all of this inline. It is the best single file to read to understand how the system is meant to behave.

---

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

The site runs at `http://localhost:3000`. Most of it works with only the Supabase variables set; see `.env.example` for what each group unlocks and what degrades without it.

```bash
npm run build     # production build
npm run lint      # eslint
```

---

## Database

Migrations are plain SQL in `supabase/migrations`, applied in order:

| File | Adds |
|---|---|
| `0001_init.sql` | Leads and enquiries |
| `0002_applications.sql` | The application flow and its statuses |
| `0003_shop.sql` | Products, orders and download tokens |

```bash
node scripts/migrate.mjs          # apply pending migrations
node scripts/migrate-chunk.mjs    # apply one in chunks, resumable
node scripts/verify-schema.mjs    # assert the live schema matches
```

`migrate.mjs` connects over `DATABASE_URL` rather than going through the dashboard's SQL editor, because large pastes there were observed to fail silently and to pick up stray keystrokes. `migrate-chunk.mjs` exists for migrations big enough that a single statement times out; it keeps resumable progress in a gitignored state file.

Row-level security is enforced in Postgres. The browser only ever holds the publishable key; the service-role key is server-only and bypasses RLS, so it is never exposed to the client.

---

## Verification

```bash
node scripts/verify-turnstile.mjs                      # checks .env.local
node scripts/verify-turnstile.mjs --file .env.production
```

Asks Cloudflare whether the configured secret is real, refuses Cloudflare's always-pass test keys inside a production file, and exits non-zero on any configuration that would leave the live site unprotected — so it can gate a deploy.

```bash
node smoke.mjs      # end-to-end smoke pass
node audit-i18n.mjs # finds untranslated strings and missing dictionary keys
```

---

## Layout

```
src/
  app/[lang]/        every page, English and French
    apply/           application flow
    status/          candidate status lookup
    admin/           review and decision panel
    shop/ cart/ checkout/ orders/
    services/ tracks/ pricing/ faq/ about/ contact/
    privacy/ terms/ cookies/ refunds/
  app/api/download/[token]/   single-use download links
  components/        ui, grouped by feature
  content/           site facts, services, tracks, FAQ, social
  lib/
    i18n/            dictionaries, locale detection, alternates
    supabase/        browser, server and admin clients
    applications/ leads/ shop/ email/ seo/
    turnstile.ts
supabase/migrations/
scripts/
```

Copy that is translated lives in `lib/i18n/dictionaries`. Copy that isn't yet lives in `content/` — `audit-i18n.mjs` reports what still needs moving.

---

## Status

Live and serving real traffic. Known gaps, all tracked in the code:

- Sole-trader disclosure details (`tradingName`, `tradingAddress` in `content/site.ts`) are placeholders and must be real before taking live payments, per UK trading disclosure rules.
- French translation is partial. The dictionaries are sound; the remaining English sits in `content/` files awaiting migration into them.

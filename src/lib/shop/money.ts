import type { Locale } from "@/lib/locale";

/**
 * Money.
 *
 * Everything is integer pence, everywhere — in the database, in the
 * cart, in the order. Floating point pounds are how a basket comes to
 * £41.99999999 and how a total stops matching the sum of its lines.
 * Pounds exist only at the two edges: what a person types into the admin
 * form, and what is printed on a page.
 */

/** "£42.00", or "42,00 £" in French — the symbol moves and so does the comma. */
export function formatPence(pence: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

/**
 * Parse what someone typed into a price box.
 *
 * Accepts "42", "42.00", "42,00" and "£42.00", because a French-speaking
 * admin will type a comma and being told off for it is absurd. Returns
 * null for anything it cannot read, so the caller decides whether that
 * is an error or an empty optional field.
 */
export function parsePounds(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }

  const cleaned = input.trim().replace(/[£\s]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  // Round after multiplying: (19.99 * 100) is 1998.9999999999998 in
  // binary floating point, and truncating gives 1998 — a penny lost on
  // roughly every third price.
  return Math.round(Number(cleaned) * 100);
}

/** Pence back to the plain "42.00" that belongs in a number input. */
export function penceToInput(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  return (pence / 100).toFixed(2);
}

/**
 * Postage.
 *
 * Bands by weight, because that is how Royal Mail actually prices and
 * because the alternative — flat rate — either overcharges a sticker or
 * loses money on a boxed bundle.
 *
 * These are placeholders with the shape right, NOT real tariffs. They
 * must be replaced with the bands KSF actually pays before anything
 * ships. Kept here rather than in the database so that changing them is
 * a reviewed commit; they are a pricing decision, not content.
 */
const UK_BANDS = [
  { upTo: 100, pence: 249 },
  { upTo: 500, pence: 349 },
  { upTo: 1000, pence: 499 },
  { upTo: 2000, pence: 699 },
  { upTo: Infinity, pence: 999 },
];

const FR_BANDS = [
  { upTo: 100, pence: 749 },
  { upTo: 500, pence: 1099 },
  { upTo: 1000, pence: 1499 },
  { upTo: 2000, pence: 1999 },
  { upTo: Infinity, pence: 2699 },
];

export const SHIP_COUNTRIES = [
  { code: "GB", en: "United Kingdom", fr: "Royaume-Uni" },
  { code: "FR", en: "France", fr: "France" },
] as const;

export type ShipCountry = (typeof SHIP_COUNTRIES)[number]["code"];

/**
 * Postage for a basket weight.
 *
 * Returns 0 for a weightless basket, which is the download-only case —
 * charging postage on a PDF would be indefensible.
 */
export function postageFor(totalGrams: number, country: ShipCountry): number {
  if (totalGrams <= 0) return 0;
  const bands = country === "FR" ? FR_BANDS : UK_BANDS;
  return bands.find((b) => totalGrams <= b.upTo)!.pence;
}

/** Free postage above this, in pence of goods. Set to null to switch it off. */
export const FREE_POSTAGE_OVER: number | null = 10000;

export function postageAfterThreshold(
  goodsPence: number,
  totalGrams: number,
  country: ShipCountry,
): number {
  const base = postageFor(totalGrams, country);
  if (base === 0) return 0;
  if (FREE_POSTAGE_OVER !== null && goodsPence >= FREE_POSTAGE_OVER) return 0;
  return base;
}

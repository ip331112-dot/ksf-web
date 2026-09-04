"use server";

import { z } from "zod";
import { priceLines } from "./queries";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/locale";

/**
 * Turning a basket of ids into something a page can show.
 *
 * The basket never stores names or prices — only variant ids — so the
 * cart page has to ask for them. Doing that here rather than in a client
 * fetch keeps the rule that prices come from the database and nowhere
 * else, and it means the cart shows the current truth: a price that has
 * changed, or a size that sold out while it sat in someone's basket,
 * appears here rather than surprising them at checkout.
 */

export type BasketViewLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  option: string | null;
  kind: "physical" | "digital";
  unitPricePence: number;
  qty: number;
  stock: number;
  /** Per unit. Zero for a download, so it never attracts postage. */
  weightGrams: number;
  /** Enough in stock, and still on sale. */
  available: boolean;
};

export type BasketView = {
  lines: BasketViewLine[];
  /** Ids that no longer resolve to anything — removed or unpublished. */
  missing: string[];
  goodsPence: number;
  hasPhysical: boolean;
  hasDigital: boolean;
  allAvailable: boolean;
};

const input = z.array(
  z.object({ variantId: z.uuid(), qty: z.coerce.number().int().min(1).max(99) }),
);

export async function lookupBasket(
  raw: unknown,
  localeInput?: string,
): Promise<BasketView> {
  const empty: BasketView = {
    lines: [], missing: [], goodsPence: 0,
    hasPhysical: false, hasDigital: false, allAvailable: true,
  };

  const parsed = input.safeParse(raw);
  if (!parsed.success || parsed.data.length === 0) return empty;

  const locale: Locale = isLocale(localeInput) ? localeInput : DEFAULT_LOCALE;
  const priced = await priceLines(parsed.data.map((l) => l.variantId));

  const missing: string[] = [];
  const lines = parsed.data.flatMap((l): BasketViewLine[] => {
    const p = priced.find((x) => x.variantId === l.variantId);
    if (!p || !p.published) {
      missing.push(l.variantId);
      return [];
    }

    // A download is never short of stock; one copy is all anyone needs,
    // so quantity is pinned at one rather than being counted down.
    const qty = p.kind === "digital" ? 1 : l.qty;

    return [{
      variantId: p.variantId,
      productId: p.productId,
      slug: p.slug,
      name: (locale === "fr" ? p.nameFr : p.nameEn) || p.slug,
      option: p.option,
      kind: p.kind,
      unitPricePence: p.unitPricePence,
      qty,
      stock: p.stock,
      weightGrams: p.kind === "digital" ? 0 : p.weightGrams,
      available: p.kind === "digital" || p.stock >= qty,
    }];
  });

  return {
    lines,
    missing,
    goodsPence: lines.reduce((sum, l) => sum + l.unitPricePence * l.qty, 0),
    hasPhysical: lines.some((l) => l.kind === "physical"),
    hasDigital: lines.some((l) => l.kind === "digital"),
    allAvailable: lines.length > 0 && missing.length === 0 && lines.every((l) => l.available),
  };
}

"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceLines } from "./queries";
import { postageAfterThreshold, SHIP_COUNTRIES } from "./money";
import { sendInvoice } from "@/lib/email/shop";
import { isLocale, DEFAULT_LOCALE } from "@/lib/locale";

/**
 * Placing an order.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * Nothing the browser sends about money is believed. The basket carries
 * variant ids and quantities and nothing else; every price, weight and
 * stock figure is read from the database here. A basket edited to claim
 * a £249 bundle costs £2.49 produces an order for £249 or no order at
 * all.
 *
 * Writes go through the service role because `orders` has no INSERT
 * policy at all — deliberately, so an order cannot be posted straight at
 * PostgREST, bypassing the stock check and the recalculated total.
 */

const line = z.object({
  variantId: z.uuid(),
  qty: z.coerce.number().int().min(1).max(99),
});

const checkoutInput = z.object({
  lines: z.array(line).min(1, "Your basket is empty.").max(40),
  name: z.string().trim().min(2, "Please give us a name.").max(120),
  email: z.email("That email address does not look right."),
  phone: z.string().trim().max(40).optional(),
  locale: z.string().optional(),

  shipLine1: z.string().trim().max(120).optional(),
  shipLine2: z.string().trim().max(120).optional(),
  shipCity: z.string().trim().max(80).optional(),
  shipPostcode: z.string().trim().max(20).optional(),
  shipCountry: z.enum(["GB", "FR"]).optional(),

  digitalConsent: z.boolean().optional(),
});

export type CheckoutResult =
  | { ok: true; reference: string; token: string }
  | { ok: false; error: string; unavailable?: string[] };

/**
 * Rate limit by hashed IP, reusing the salt the enquiry pipeline
 * already uses. Never stores a raw address.
 */
async function ipHash(): Promise<string | null> {
  const salt = process.env.LEAD_IP_SALT;
  if (!salt) return null;

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
  if (!ip) return null;

  return createHash("sha256").update(ip + salt).digest("hex");
}

export async function placeOrder(raw: unknown): Promise<CheckoutResult> {
  const parsed = checkoutInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const input = parsed.data;
  const locale = isLocale(input.locale) ? input.locale : DEFAULT_LOCALE;

  // Re-price from the database. This is the whole security boundary.
  const priced = await priceLines(input.lines.map((l) => l.variantId));
  if (priced.length === 0) {
    return { ok: false, error: "Nothing in your basket is available any more." };
  }

  const unavailable: string[] = [];
  const resolved = input.lines.flatMap((l) => {
    const p = priced.find((x) => x.variantId === l.variantId);
    if (!p) {
      unavailable.push("an item that has been removed");
      return [];
    }
    if (!p.published) {
      unavailable.push(locale === "fr" ? p.nameFr : p.nameEn);
      return [];
    }
    // Digital never runs out; physical must have enough on the shelf.
    if (p.kind === "physical" && p.stock < l.qty) {
      unavailable.push(locale === "fr" ? p.nameFr : p.nameEn);
      return [];
    }
    return [{ ...p, qty: l.qty }];
  });

  if (unavailable.length > 0) {
    return {
      ok: false,
      error: "Some things in your basket are no longer available.",
      unavailable,
    };
  }

  const hasPhysical = resolved.some((l) => l.kind === "physical");
  const hasDigital = resolved.some((l) => l.kind === "digital");

  // A parcel needs somewhere to go. Checked here rather than in the zod
  // schema because whether it applies depends on the basket, which the
  // schema cannot see.
  if (hasPhysical) {
    const missing = !input.shipLine1 || !input.shipCity || !input.shipPostcode || !input.shipCountry;
    if (missing) {
      return { ok: false, error: "We need a delivery address for the items being posted." };
    }
  }

  // Express consent to immediate delivery, which waives the statutory
  // 14-day withdrawal right on downloads. Refused rather than assumed:
  // this may have to be proved later.
  if (hasDigital && !input.digitalConsent) {
    return {
      ok: false,
      error:
        "Please confirm you want the downloads straight away and understand that this ends the 14-day cancellation right for them.",
    };
  }

  const goodsPence = resolved.reduce((sum, l) => sum + l.unitPricePence * l.qty, 0);
  const grams = resolved.reduce(
    (sum, l) => sum + (l.kind === "physical" ? l.weightGrams * l.qty : 0),
    0,
  );
  const country = (input.shipCountry ?? "GB") as (typeof SHIP_COUNTRIES)[number]["code"];
  const postagePence = hasPhysical ? postageAfterThreshold(goodsPence, grams, country) : 0;
  const totalPence = goodsPence + postagePence;

  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      email: input.email,
      name: input.name,
      phone: input.phone || null,
      locale,
      status: "awaiting_payment",
      ship_line1: input.shipLine1 || null,
      ship_line2: input.shipLine2 || null,
      ship_city: input.shipCity || null,
      ship_postcode: input.shipPostcode || null,
      ship_country: hasPhysical ? country : null,
      goods_pence: goodsPence,
      postage_pence: postagePence,
      total_pence: totalPence,
      digital_consent: Boolean(input.digitalConsent),
      digital_consent_at: input.digitalConsent ? new Date().toISOString() : null,
      ip_hash: await ipHash(),
    })
    .select("id, reference")
    .single<{ id: string; reference: string }>();

  if (orderError || !order) {
    console.error("[shop] order insert:", orderError?.message);
    return { ok: false, error: "We could not place that order. Please try again." };
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    resolved.map((l) => ({
      order_id: order.id,
      variant_id: l.variantId,
      product_id: l.productId,
      // Frozen at purchase: changing a price later must never rewrite
      // what this person agreed to pay.
      name_snapshot: (locale === "fr" ? l.nameFr : l.nameEn) || l.slug,
      option_snapshot: l.option,
      kind: l.kind,
      unit_price_pence: l.unitPricePence,
      qty: l.qty,
    })),
  );

  if (itemsError) {
    // The order row without its lines is worse than no order at all — it
    // would show a total with nothing in it. Roll it back by hand;
    // there is no transaction across PostgREST calls.
    console.error("[shop] order items:", itemsError.message);
    await admin.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "We could not place that order. Please try again." };
  }

  const token = randomBytes(32).toString("hex");
  const { error: tokenError } = await admin.from("order_tokens").insert({
    token_hash: createHash("sha256").update(token).digest("hex"),
    order_id: order.id,
    expires_at: new Date(Date.now() + 180 * 86_400_000).toISOString(),
  });

  if (tokenError) console.error("[shop] order token:", tokenError.message);

  await admin.from("order_events").insert({
    order_id: order.id,
    actor: null,
    event: "placed",
    detail: `${resolved.length} line(s), ${totalPence} pence`,
  });

  // Email last: the order is already stored, so a mail provider having a
  // bad afternoon must not turn a placed order into an error page. The
  // success page tells the buyer whether it actually went.
  await sendInvoice({
    to: input.email,
    name: input.name,
    reference: order.reference,
    locale,
    lines: resolved.map((l) => ({
      name: (locale === "fr" ? l.nameFr : l.nameEn) || l.slug,
      option: l.option,
      qty: l.qty,
      unitPricePence: l.unitPricePence,
    })),
    goodsPence,
    postagePence,
    totalPence,
    statusPath: `/${locale}/orders/${token}`,
  });

  return { ok: true, reference: order.reference, token };
}

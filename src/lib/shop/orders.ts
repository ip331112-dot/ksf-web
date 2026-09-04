import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "./schema";

/**
 * Reading and granting access to an order, without accounts.
 *
 * Mirrors the applications side: only the SHA-256 hash of a token is
 * stored, so a leaked database hands out no working links. The raw token
 * exists in the buyer's email and their browser history and nowhere
 * else. Everything here runs under the service role because neither
 * `order_tokens` nor `download_grants` has any RLS policy at all.
 */

export const GRANT_DAYS = 30;
export const GRANT_MAX_DOWNLOADS = 5;

export const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");

export type OrderItemRow = {
  id: string;
  name_snapshot: string;
  option_snapshot: string | null;
  kind: "physical" | "digital";
  unit_price_pence: number;
  qty: number;
};

export type OrderRow = {
  id: string;
  reference: string;
  created_at: string;
  status: OrderStatus;
  name: string;
  email: string;
  locale: string;
  ship_line1: string | null;
  ship_line2: string | null;
  ship_city: string | null;
  ship_postcode: string | null;
  ship_country: string | null;
  goods_pence: number;
  postage_pence: number;
  total_pence: number;
  tracking: string | null;
  carrier: string | null;
  dispatched_at: string | null;
  paid_at: string | null;
  items: OrderItemRow[];
};

/** A download link belonging to one line of one order. */
export type GrantRow = {
  token_hash: string;
  order_item_id: string;
  expires_at: string;
  max_downloads: number;
  downloads_used: number;
};

/**
 * Resolve a status-page token.
 *
 * Records the use, so a link being hammered is visible in the data. An
 * expired token returns null rather than an expired order — the page
 * cannot then leak a name or an address to someone holding a stale link.
 */
export async function orderByToken(token: string): Promise<OrderRow | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;

  const admin = createAdminClient();

  const { data: row } = await admin
    .from("order_tokens")
    .select("order_id, expires_at")
    .eq("token_hash", sha256(token))
    .maybeSingle<{ order_id: string; expires_at: string }>();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await admin
    .from("order_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", sha256(token));

  const { data: order } = await admin
    .from("orders")
    .select(
      `id, reference, created_at, status, name, email, locale,
       ship_line1, ship_line2, ship_city, ship_postcode, ship_country,
       goods_pence, postage_pence, total_pence,
       tracking, carrier, dispatched_at, paid_at,
       items:order_items(id, name_snapshot, option_snapshot, kind, unit_price_pence, qty)`,
    )
    .eq("id", row.order_id)
    .maybeSingle<OrderRow>();

  return order ?? null;
}

/**
 * Issue one download link per digital line, returning the raw tokens.
 *
 * Called when an order is marked paid. Re-issuing is safe and
 * deliberate: a buyer who has used up five downloads or let a link
 * expire gets a fresh grant rather than an argument, and the old row is
 * replaced so the count starts again.
 */
export async function issueDownloadGrants(
  orderId: string,
): Promise<{ orderItemId: string; token: string }[]> {
  const admin = createAdminClient();

  const { data: items } = await admin
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("kind", "digital")
    .returns<{ id: string }[]>();

  if (!items || items.length === 0) return [];

  const issued: { orderItemId: string; token: string }[] = [];

  for (const item of items) {
    const token = randomBytes(32).toString("hex");

    // Replace rather than accumulate: one live link per line keeps the
    // download count meaningful.
    await admin.from("download_grants").delete().eq("order_item_id", item.id);

    const { error } = await admin.from("download_grants").insert({
      token_hash: sha256(token),
      order_item_id: item.id,
      expires_at: new Date(Date.now() + GRANT_DAYS * 86_400_000).toISOString(),
      max_downloads: GRANT_MAX_DOWNLOADS,
    });

    if (error) {
      console.error("[shop] grant:", error.message);
      continue;
    }
    issued.push({ orderItemId: item.id, token });
  }

  return issued;
}

export type GrantState = {
  downloadsLeft: number;
  expired: boolean;
};

/**
 * Live grants for an order, so the status page can show its links.
 *
 * Expiry is decided HERE rather than in the page. Reading the clock is
 * impure and React rightly refuses it during render — the same reason
 * the enquiries board decorates its rows in a loader instead of in the
 * component.
 */
export async function grantsForOrder(orderId: string): Promise<Map<string, GrantState>> {
  const admin = createAdminClient();

  const { data: items } = await admin
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("kind", "digital")
    .returns<{ id: string }[]>();

  const ids = (items ?? []).map((i) => i.id);
  if (ids.length === 0) return new Map();

  const { data } = await admin
    .from("download_grants")
    .select("order_item_id, expires_at, downloads_used, max_downloads")
    .in("order_item_id", ids)
    .returns<
      { order_item_id: string; expires_at: string; downloads_used: number; max_downloads: number }[]
    >();

  const now = Date.now();

  return new Map(
    (data ?? []).map((g) => [
      g.order_item_id,
      {
        downloadsLeft: Math.max(g.max_downloads - g.downloads_used, 0),
        expired: new Date(g.expires_at).getTime() < now,
      },
    ]),
  );
}

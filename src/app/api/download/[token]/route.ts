import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/shop/orders";

/**
 * Serving a purchased file.
 *
 * TWO WAYS IN, ONE EXIT
 *   /api/download/<grantToken>              — the link emailed per file
 *   /api/download/<orderToken>?item=<uuid>  — a button on the order page
 *
 * The emailed link is per file, so forwarding a receipt does not hand
 * over the downloads with it. The order-page route exists because only
 * the HASH of an emailed token is stored: the status page genuinely
 * cannot reconstruct those links, and re-issuing one on every page view
 * would reset the download count.
 *
 * Both paths end the same way — a 60-second signed URL from the private
 * bucket. The storage path is never exposed, and the bucket has no read
 * policy at all, so this route is the only way to reach the object.
 *
 * A Route Handler cannot call `next/root-params`, which is why nothing
 * here is locale-aware. It serves a file; it has no copy to translate.
 */

export const dynamic = "force-dynamic";

const HEX64 = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One response for every failure, so this cannot be used as an oracle. */
function refuse(reason: string) {
  console.info(`[shop] download refused: ${reason}`);
  return NextResponse.json(
    { error: "That download link is not valid, has expired, or has been used up." },
    { status: 404 },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!HEX64.test(token)) return refuse("malformed token");

  const admin = createAdminClient();
  const itemParam = request.nextUrl.searchParams.get("item");

  let orderItemId: string;
  let grantHash: string | null = null;

  if (itemParam) {
    // ---- Order token + item -------------------------------------
    if (!UUID.test(itemParam)) return refuse("malformed item id");

    const { data: tokenRow } = await admin
      .from("order_tokens")
      .select("order_id, expires_at")
      .eq("token_hash", sha256(token))
      .maybeSingle<{ order_id: string; expires_at: string }>();

    if (!tokenRow) return refuse("unknown order token");
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) return refuse("order token expired");

    // The item must belong to THIS order. Without this check an order
    // token would download any file in the shop.
    const { data: item } = await admin
      .from("order_items")
      .select("id, order_id, kind, order:orders(status)")
      .eq("id", itemParam)
      .maybeSingle<{
        id: string;
        order_id: string;
        kind: string;
        order: { status: string } | null;
      }>();

    if (!item || item.order_id !== tokenRow.order_id) return refuse("item not on this order");
    if (item.kind !== "digital") return refuse("not a download");

    // Unpaid means undelivered. This is the paywall.
    const status = item.order?.status;
    if (status !== "paid" && status !== "dispatched") return refuse("order not paid");

    orderItemId = item.id;
  } else {
    // ---- Emailed per-file grant ----------------------------------
    grantHash = sha256(token);

    const { data: grant } = await admin
      .from("download_grants")
      .select("order_item_id, expires_at, max_downloads, downloads_used")
      .eq("token_hash", grantHash)
      .maybeSingle<{
        order_item_id: string;
        expires_at: string;
        max_downloads: number;
        downloads_used: number;
      }>();

    if (!grant) return refuse("unknown grant");
    if (new Date(grant.expires_at).getTime() < Date.now()) return refuse("grant expired");
    if (grant.downloads_used >= grant.max_downloads) return refuse("grant used up");

    // Counted BEFORE the file is served, not after. It fails closed: a
    // crash mid-download costs the buyer one of five attempts rather
    // than granting unlimited ones.
    const { error } = await admin
      .from("download_grants")
      .update({
        downloads_used: grant.downloads_used + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("token_hash", grantHash);

    if (error) return refuse(`could not record the download: ${error.message}`);

    orderItemId = grant.order_item_id;
  }

  // ---- Resolve the file ------------------------------------------
  const { data: line } = await admin
    .from("order_items")
    .select("order_id, product:products(file_path, name_en)")
    .eq("id", orderItemId)
    .maybeSingle<{
      order_id: string;
      product: { file_path: string | null; name_en: string | null } | null;
    }>();

  if (!line?.product?.file_path) return refuse("product has no file");

  const { data: signed, error: signError } = await admin.storage
    .from("shop-files")
    .createSignedUrl(line.product.file_path, 60, { download: true });

  if (signError || !signed) return refuse(`could not sign: ${signError?.message}`);

  // Every fetch is on the trail, so a link being hammered from twelve
  // countries is visible rather than invisible.
  await admin.from("order_events").insert({
    order_id: line.order_id,
    actor: null,
    event: "download",
    detail: line.product.name_en ?? orderItemId,
  });

  return NextResponse.redirect(signed.signedUrl);
}

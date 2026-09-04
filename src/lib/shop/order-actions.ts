"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDownloadLinks, sendDispatched } from "@/lib/email/shop";
import { issueDownloadGrants, GRANT_DAYS, GRANT_MAX_DOWNLOADS } from "./orders";
import { isLocale, DEFAULT_LOCALE } from "@/lib/locale";

/**
 * Staff actions on orders.
 *
 * Authorises independently of the page, like every other admin action:
 * a Server Action is a POST endpoint, and rendering a screen behind a
 * login is not a boundary.
 *
 * Writes use the service role rather than the session client because
 * `order_events` has no INSERT policy and `download_grants` has no
 * policy at all — the same shape as the applications audit trail, and
 * for the same reason.
 */

export type Result = { ok: boolean; error?: string; emailed?: boolean };

async function requireAdmin(): Promise<{ email: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { email: null, error: "Your session has expired. Sign in again." };

  const { data: membership } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { email: null, error: "This account is not staff." };
  return { email: user.email ?? null, error: null };
}

function refresh(id: string) {
  revalidatePath("/[lang]/admin/orders", "page");
  revalidatePath(`/[lang]/admin/orders/${id}`, "page");
}

const markPaidInput = z.object({
  orderId: z.uuid(),
  amountPence: z.coerce.number().int().min(0).max(100_000_00),
  note: z.string().trim().max(200).optional(),
});

/**
 * Confirm the money arrived.
 *
 * This is the pivot of the whole manual flow. In one step it: records
 * who confirmed it and what they saw on the statement, brings stock
 * down, issues download links, and emails them.
 *
 * Stock moves HERE rather than at add-to-basket, so an abandoned cart
 * never holds the last adapter hostage.
 */
export async function markPaid(raw: unknown): Promise<Result> {
  const { email: actor, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const parsed = markPaidInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That input is not valid." };
  }
  const { orderId, amountPence, note } = parsed.data;

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, reference, status, name, email, locale, total_pence")
    .eq("id", orderId)
    .maybeSingle<{
      id: string; reference: string; status: string; name: string;
      email: string; locale: string; total_pence: number;
    }>();

  if (!order) return { ok: false, error: "That order no longer exists." };
  if (order.status !== "awaiting_payment") {
    return { ok: false, error: `That order is already marked ${order.status.replace("_", " ")}.` };
  }

  const { error } = await admin
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: actor,
      payment_note: note || null,
    })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };

  // Recorded rather than blocked. A short payment is a conversation to
  // have with the buyer, not something to discover a week later because
  // the software silently refused it.
  const mismatch = amountPence !== order.total_pence;

  await admin.from("order_events").insert({
    order_id: orderId,
    actor,
    event: "paid",
    detail: [
      `received ${amountPence} pence`,
      mismatch ? `EXPECTED ${order.total_pence} — MISMATCH` : null,
      note ? `ref seen: ${note}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  });

  const { error: stockError } = await admin.rpc("decrement_stock_for_order", {
    p_order_id: orderId,
  });
  if (stockError) {
    // Loud, but not fatal: the payment is recorded and that matters more
    // than the count being right this second.
    console.error("[shop] STOCK NOT DECREMENTED:", stockError.message);
  }

  const locale = isLocale(order.locale) ? order.locale : DEFAULT_LOCALE;
  const issued = await issueDownloadGrants(orderId);

  let emailed = false;
  if (issued.length > 0) {
    const { data: names } = await admin
      .from("order_items")
      .select("id, name_snapshot")
      .in("id", issued.map((g) => g.orderItemId))
      .returns<{ id: string; name_snapshot: string }[]>();

    emailed = await sendDownloadLinks({
      to: order.email,
      name: order.name,
      reference: order.reference,
      locale,
      files: issued.map((g) => ({
        name: names?.find((n) => n.id === g.orderItemId)?.name_snapshot ?? "Your file",
        path: `/api/download/${g.token}`,
      })),
      expiresInDays: GRANT_DAYS,
      maxDownloads: GRANT_MAX_DOWNLOADS,
    });

    await admin.from("order_events").insert({
      order_id: orderId,
      actor: null,
      event: emailed ? "downloads_emailed" : "downloads_not_emailed",
      detail: `${issued.length} file(s)`,
    });
  }

  refresh(orderId);
  return { ok: true, emailed: issued.length > 0 ? emailed : undefined };
}

const dispatchInput = z.object({
  orderId: z.uuid(),
  carrier: z.string().trim().max(60).optional(),
  tracking: z.string().trim().max(120).optional(),
});

export async function markDispatched(raw: unknown): Promise<Result> {
  const { email: actor, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const parsed = dispatchInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That input is not valid." };
  }
  const { orderId, carrier, tracking } = parsed.data;

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, reference, status, name, email, locale")
    .eq("id", orderId)
    .maybeSingle<{
      id: string; reference: string; status: string;
      name: string; email: string; locale: string;
    }>();

  if (!order) return { ok: false, error: "That order no longer exists." };
  if (order.status !== "paid") {
    return { ok: false, error: "Mark the order paid before dispatching it." };
  }

  const { error } = await admin
    .from("orders")
    .update({
      status: "dispatched",
      dispatched_at: new Date().toISOString(),
      dispatched_by: actor,
      carrier: carrier || null,
      tracking: tracking || null,
    })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };

  await admin.from("order_events").insert({
    order_id: orderId,
    actor,
    event: "dispatched",
    detail: tracking ? `${carrier ?? "tracking"}: ${tracking}` : null,
  });

  const locale = isLocale(order.locale) ? order.locale : DEFAULT_LOCALE;

  // The status link is not reconstructable here — only its hash is
  // stored — so the email points at the order page without a token and
  // relies on the buyer's original link. Tracking is in the email body
  // itself, which is the part they actually need.
  const emailed = await sendDispatched({
    to: order.email,
    name: order.name,
    reference: order.reference,
    locale,
    carrier: carrier || null,
    tracking: tracking || null,
    statusPath: `/${locale}/shop`,
  });

  refresh(orderId);
  return { ok: true, emailed };
}

export async function cancelOrder(orderId: string, reason: string): Promise<Result> {
  const { email: actor, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "That order id is not valid." };

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle<{ status: string }>();

  if (!order) return { ok: false, error: "That order no longer exists." };

  // Cancelling a paid order means money has to go back, and there is no
  // refund path yet — the same guard the applications side already
  // carries. Blocked in code until it exists.
  if (order.status !== "awaiting_payment") {
    return {
      ok: false,
      error:
        "Only an unpaid order can be cancelled here. Refunding a paid order has to be done by hand until the refund flow is built.",
    };
  }

  const { error } = await admin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await admin.from("order_events").insert({
    order_id: orderId,
    actor,
    event: "cancelled",
    detail: reason.trim().slice(0, 2000) || null,
  });

  refresh(orderId);
  return { ok: true };
}

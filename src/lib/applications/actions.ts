"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { SITE } from "@/content/site";
import { getTrack } from "@/content/tracks";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { applicationSchema, type ApplyResult } from "./schema";

/** Applications per IP inside the window. Lower than enquiries: nobody
 *  legitimately applies to three tracks in ten minutes. */
const RATE_LIMIT = 2;
const RATE_WINDOW_MINUTES = 30;

/** How long a status link stays valid. */
const TOKEN_DAYS = 180;

const FALLBACK = `We could not submit that just now. Please email ${SITE.email} and we will take your application by hand.`;

/**
 * Whether payment is part of the flow.
 *
 * Off by default. The roadmap's own advice is that charging before a
 * decision suppresses volume, so this is the switch between the two
 * models — and while it is off, an application goes straight to
 * 'submitted' and Stripe is never involved.
 */
export async function applyRequiresPayment(): Promise<boolean> {
  return process.env.APPLY_REQUIRES_PAYMENT === "true";
}

async function hashedIp(): Promise<{ hash: string | null; ip: string | null }> {
  const salt = process.env.LEAD_IP_SALT;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;

  if (!ip) return { hash: null, ip: null };
  if (!salt) return { hash: null, ip };
  return { hash: createHash("sha256").update(`${salt}:${ip}`).digest("hex"), ip };
}

export async function submitApplication(raw: unknown): Promise<ApplyResult> {
  /**
   * Honeypot first, before validation.
   *
   * The schema rejects a non-empty `company`, so checking after parsing
   * made the silent-accept branch below unreachable: a bot received
   * "please check the highlighted answers" and learned it had been
   * caught. A honeypot that announces itself is not a honeypot.
   */
  const honeypot =
    raw !== null && typeof raw === "object"
      ? (raw as Record<string, unknown>).company
      : undefined;

  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return {
      ok: true,
      reference: `KSF-${new Date().getFullYear()}-0000`,
      statusPath: "",
    };
  }

  const parsed = applicationSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[]>;
    return {
      ok: false,
      message: "Please check the highlighted answers.",
      errors: Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""]),
      ),
    };
  }

  const app = parsed.data;

  // The track must exist. A submission naming an unknown slug is either a
  // stale bookmark or someone probing, and neither should reach the table.
  if (!getTrack(app.courseSlug)) {
    return { ok: false, message: "That track could not be found. Please start again from the track page." };
  }

  const { hash: ipHash, ip } = await hashedIp();

  const turnstile = await verifyTurnstile(app.turnstileToken, ip ?? undefined);
  if (!turnstile.ok) {
    const ourFault = turnstile.reason === "unreachable" || turnstile.reason === "not-configured";
    return {
      ok: false,
      message: ourFault ? FALLBACK : "That check did not pass. Please try again.",
    };
  }

  try {
    const supabase = createAdminClient();

    if (ipHash) {
      const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
      const { count, error } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);

      if (!error && (count ?? 0) >= RATE_LIMIT) {
        return {
          ok: false,
          message: `That is several applications in a short time. Please wait, or email ${SITE.email}.`,
        };
      }
    }

    const paymentOn = await applyRequiresPayment();

    const { data, error } = await supabase
      .from("applications")
      .insert({
        course_slug: app.courseSlug,
        name: app.name,
        email: app.email,
        phone: app.phone || null,
        country: app.country || null,
        experience_level: app.experienceLevel,
        occupation: app.occupation || null,
        background: app.background || null,
        motivation: app.motivation,
        goals: app.goals || null,
        weekly_hours:
          app.weeklyHours === "" || app.weeklyHours === undefined
            ? null
            : Number(app.weeklyHours),
        agreed_terms: app.agreedTerms,
        agreed_immediate_start: app.agreedImmediateStart ?? false,
        status: paymentOn ? "payment_pending" : "submitted",
        ip_hash: ipHash,
      })
      .select("id, reference")
      .single();

    if (error || !data) {
      console.error("[apply] Insert failed:", error?.message);
      return { ok: false, message: FALLBACK };
    }

    // The status link. Only the hash is stored, so this raw value is the
    // one and only copy — if it is lost here, it cannot be recovered,
    // only reissued.
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const { error: tokenError } = await supabase.from("access_tokens").insert({
      token_hash: tokenHash,
      application_id: data.id,
      expires_at: new Date(Date.now() + TOKEN_DAYS * 86_400_000).toISOString(),
    });

    if (tokenError) {
      // The application is safely stored; only the self-service link is
      // missing. Not worth failing the submission over — they still have
      // their reference, and staff can reissue.
      console.error("[apply] Status token not created:", tokenError.message);
    }

    await supabase.from("application_events").insert({
      application_id: data.id,
      event: paymentOn ? "created_awaiting_payment" : "submitted",
      detail: `Applied for ${app.courseSlug}`,
    });

    return {
      ok: true,
      reference: data.reference,
      statusPath: tokenError ? "" : `/status/${token}`,
    };
  } catch (err) {
    console.error("[apply] Storage unavailable:", err);
    return { ok: false, message: FALLBACK };
  }
}

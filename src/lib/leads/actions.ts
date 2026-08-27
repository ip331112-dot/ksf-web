"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { SITE } from "@/content/site";
import { sendEnquiryAlert } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { enquirySchema, type EnquiryState } from "./schema";

/** Rate limit: this many enquiries from one IP inside the window. */
const RATE_LIMIT = 3;
const RATE_WINDOW_MINUTES = 10;

/**
 * Shown whenever we cannot take the message. It names the direct routes,
 * because a visitor who has just typed out their problem deserves
 * somewhere to send it rather than an apology.
 */
const FALLBACK = `We could not send that just now. Please email ${SITE.email} or call us — both reach us today.`;

/**
 * The only success wording there is. The honeypot path returns it too, so
 * a bot cannot tell acceptance from silent rejection by diffing the reply.
 */
const ACCEPTED = `Thank you — we have your message and will reply within ${SITE.responseTime}.`;

/**
 * The visitor's IP, hashed.
 *
 * We need to count repeat submissions, not identify anybody, so the raw
 * address is never stored. Without a salt the hash of an IPv4 address is
 * trivially reversible — there are only four billion of them — so an
 * unsalted deployment gets no ip_hash at all and no rate limiting.
 */
async function hashedIp(): Promise<{ hash: string | null; ip: string | null }> {
  const salt = process.env.LEAD_IP_SALT;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    null;

  if (!ip) return { hash: null, ip: null };
  if (!salt) {
    console.warn("[enquiry] LEAD_IP_SALT unset — rate limiting is disabled.");
    return { hash: null, ip };
  }

  return {
    hash: createHash("sha256").update(`${salt}:${ip}`).digest("hex"),
    ip,
  };
}

export async function submitEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    service: String(formData.get("service") ?? ""),
    message: String(formData.get("message") ?? ""),
    sourcePath: String(formData.get("sourcePath") ?? ""),
    company: String(formData.get("company") ?? ""),
  };

  /** Echoed back on every failure so the form redraws with their words. */
  const typed = {
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    service: raw.service,
    message: raw.message,
  };

  // 1. Honeypot. A bot filled the hidden field: accept, discard, say
  //    nothing. Reporting the rejection would only teach it to adapt.
  if (raw.company.length > 0) {
    return { ok: true, message: ACCEPTED };
  }

  // 2. Same schema the browser ran, because the browser is not a
  //    trustworthy narrator of what it sent.
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      values: typed,
      errors: Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""]),
      ),
    };
  }
  const lead = parsed.data;

  const { hash: ipHash, ip } = await hashedIp();

  // 3. Turnstile.
  const turnstile = await verifyTurnstile(
    formData.get("cf-turnstile-response")?.toString(),
    ip ?? undefined,
  );
  if (!turnstile.ok) {
    return {
      ok: false,
      message:
        turnstile.reason === "unreachable"
          ? FALLBACK
          : "That check did not pass. Please try again.",
      errors: { turnstile: "Verification failed." },
      values: typed,
    };
  }

  let stored = false;

  try {
    const supabase = createAdminClient();

    // 4. Rate limit, counted from the table itself — no extra service to
    //    run, and it survives a redeploy, which an in-memory counter
    //    would not.
    if (ipHash) {
      const since = new Date(
        Date.now() - RATE_WINDOW_MINUTES * 60 * 1000,
      ).toISOString();

      const { count, error } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);

      if (!error && (count ?? 0) >= RATE_LIMIT) {
        return {
          ok: false,
          message: `That is a few messages in a short time. Please wait ${RATE_WINDOW_MINUTES} minutes, or email ${SITE.email}.`,
          values: typed,
        };
      }
    }

    // 5. Insert. RLS denies every other route to this table.
    const { error } = await supabase.from("leads").insert({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      service: lead.service || null,
      message: lead.message,
      source_path: lead.sourcePath || null,
      ip_hash: ipHash,
    });

    if (error) {
      console.error("[enquiry] Insert failed:", error.message);
    } else {
      stored = true;
    }
  } catch (err) {
    console.error("[enquiry] Storage unavailable:", err);
  }

  // 6. Alert. Normally fire-and-forget, but if the write failed this mail
  //    is the only surviving copy, so wait for it before answering.
  const alerted = await sendEnquiryAlert(lead);

  if (!stored && !alerted) {
    // Nothing captured it. Saying "thank you" here would be a lie that
    // costs KSF a customer.
    return { ok: false, message: FALLBACK, values: typed };
  }

  // 7. One generic success. It reveals nothing about what happened
  //    downstream, so the form cannot be used to probe the database.
  return { ok: true, message: ACCEPTED };
}

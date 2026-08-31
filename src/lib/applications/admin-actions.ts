"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDecision } from "@/lib/email";
import { DECISIONS, type Decision } from "./decisions";

/**
 * Issue a fresh status link for an application and return its path.
 *
 * Returns "" if it cannot be created — the decision email then simply
 * omits the link rather than shipping a broken one.
 */
async function mintStatusPath(applicationId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await createAdminClient().from("access_tokens").insert({
    token_hash: tokenHash,
    application_id: applicationId,
    expires_at: new Date(Date.now() + 180 * 86_400_000).toISOString(),
  });

  if (error) {
    console.error("[admin] Could not issue a status link:", error.message);
    return "";
  }
  return `/status/${token}`;
}

/**
 * Append to the audit trail.
 *
 * Uses the service role deliberately. `application_events` has no INSERT
 * policy — an audit trail the client can write to is not an audit trail —
 * so the session client is refused by RLS. Writing it here keeps the
 * table unreachable from the browser while still recording what staff did.
 *
 * The first version of this used the session client and RLS rejected it
 * silently, leaving status changes with no trail at all. Errors are
 * logged loudly now rather than swallowed.
 */
async function recordEvent(
  applicationId: string,
  event: string,
  actor: string | null,
  detail?: string,
) {
  const { error } = await createAdminClient().from("application_events").insert({
    application_id: applicationId,
    actor,
    event,
    detail: detail ?? null,
  });

  if (error) {
    // Not worth failing the caller over — the status change itself has
    // already succeeded — but a missing trail must never pass unnoticed.
    console.error("[admin] AUDIT TRAIL WRITE FAILED:", event, error.message);
  }
}

const input = z.object({
  applicationId: z.uuid(),
  decision: z.enum(DECISIONS),
  feedback: z
    .string()
    .trim()
    .min(10, "Please write at least a sentence — feedback is the promise.")
    .max(8000, "That is longer than the 8000 characters we can store."),
});

type Result = {
  ok: boolean;
  error?: string;
  /** Whether the applicant was actually emailed. The panel reports this
   *  rather than assuming, so staff know when to follow up by hand. */
  emailed?: boolean;
};

/**
 * Authorise independently of the page.
 *
 * A Server Action is a POST endpoint; rendering the panel behind a login
 * is not a boundary. Returns the staff email so it can be recorded as the
 * actor on the audit trail.
 */
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
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
  return { email: user.email ?? null, error: null as string | null };
}

/**
 * Move an application to in_review.
 *
 * The layout doc describes in_review as "you opened it", but a GET that
 * mutates is a trap — a link prefetch would silently mark applications as
 * read. So it is an explicit action instead.
 */
export async function startReview(applicationId: string): Promise<Result> {
  if (!z.uuid().safeParse(applicationId).success) {
    return { ok: false, error: "That application id is not valid." };
  }

  const supabase = await createClient();
  const { email, error: authError } = await requireAdmin(supabase);
  if (authError) return { ok: false, error: authError };

  const { error } = await supabase
    .from("applications")
    .update({ status: "in_review" })
    .eq("id", applicationId)
    .in("status", ["submitted", "payment_pending"]);

  if (error) {
    console.error("[admin] Start review failed:", error.message);
    return { ok: false, error: "Could not update that. Please try again." };
  }

  await recordEvent(applicationId, "in_review", email);

  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin/applications");
  return { ok: true };
}

/**
 * Record a decision and its written feedback.
 *
 * Feedback is mandatory for every outcome, not only acceptance. That is
 * the product's actual promise — a decline with no explanation is the
 * thing this whole model exists to avoid.
 *
 * NOT YET AUTOMATED: on decline, the roadmap requires cancelling the
 * Stripe subscription and refunding £10 in the same breath. Payment is
 * currently switched off so nothing has been charged and there is nothing
 * to refund — but the moment APPLY_REQUIRES_PAYMENT is turned on, this
 * function must do that before it is safe to use.
 */
export async function recordDecision(
  applicationId: string,
  decision: Decision,
  feedback: string,
): Promise<Result> {
  const parsed = input.safeParse({ applicationId, decision, feedback });
  if (!parsed.success) {
    return { ok: false, error: z.flattenError(parsed.error).fieldErrors.feedback?.[0] ?? "That decision was not understood." };
  }

  const supabase = await createClient();
  const { email, error: authError } = await requireAdmin(supabase);
  if (authError) return { ok: false, error: authError };

  const { data: app } = await supabase
    .from("applications")
    .select("id, status, paid_at, name, email, reference, course_slug")
    .eq("id", parsed.data.applicationId)
    .maybeSingle<{
      id: string;
      status: string;
      paid_at: string | null;
      name: string;
      email: string;
      reference: string;
      course_slug: string;
    }>();

  if (!app) return { ok: false, error: "That application could not be found." };

  // Refuse to decline a paid application until the refund path exists.
  // Better to block the action than to take someone's money and send a
  // rejection with no refund attached.
  if (parsed.data.decision === "declined" && app.paid_at) {
    return {
      ok: false,
      error:
        "This application has been paid. Automatic cancel and refund is not built yet, so declining is blocked — refund it in Stripe first.",
    };
  }

  const { error: feedbackError } = await supabase.from("application_feedback").upsert(
    {
      application_id: parsed.data.applicationId,
      body: parsed.data.feedback,
      decided_by: email,
      decided_at: new Date().toISOString(),
    },
    { onConflict: "application_id" },
  );

  if (feedbackError) {
    console.error("[admin] Feedback save failed:", feedbackError.message);
    return { ok: false, error: "Could not save the feedback. Nothing was changed." };
  }

  // Status moves only after the feedback is safely stored, so a failure
  // never leaves someone decided-but-unexplained.
  const { error: statusError } = await supabase
    .from("applications")
    .update({ status: parsed.data.decision })
    .eq("id", parsed.data.applicationId);

  if (statusError) {
    console.error("[admin] Status update failed:", statusError.message);
    return { ok: false, error: "Feedback was saved but the status did not change. Try again." };
  }

  await recordEvent(
    parsed.data.applicationId,
    parsed.data.decision,
    email,
    "Decision recorded with written feedback",
  );

  /**
   * Tell the applicant.
   *
   * A fresh status token is minted for this email rather than reusing
   * the original: tokens are stored only as SHA-256 hashes, so the one
   * issued at submission cannot be recovered by anyone, including us.
   * Issuing a new one is exactly what the site already promises.
   *
   * The decision is already recorded by this point, so a mail failure
   * is reported to staff rather than rolled back — the applicant can
   * still be told by hand, but only if we say the email did not go.
   */
  const statusPath = await mintStatusPath(parsed.data.applicationId);

  /**
   * KNOWN GAP: this email is always English.
   *
   * The confirmation sent at submission time is translated, because the
   * apply flow hands its locale straight to the action. A decision is
   * made days later by staff, and `applications` has no column recording
   * the language the person applied in — so there is nothing to pass as
   * `locale` here. Closing this needs a migration adding
   * `applications.locale`, the insert in actions.ts setting it, and this
   * call reading it back. Until then a French applicant gets a French
   * confirmation and an English decision.
   */
  const mail = await sendDecision({
    name: app.name,
    email: app.email,
    reference: app.reference,
    courseSlug: app.course_slug,
    statusPath,
    decision: parsed.data.decision,
    feedback: parsed.data.feedback,
  });

  if (!mail.sent) {
    console.error(
      `[admin] ${app.reference}: decision recorded but email NOT delivered (${mail.reason}).`,
    );
  }

  revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
  revalidatePath("/admin/applications");
  return { ok: true, emailed: mail.sent };
}

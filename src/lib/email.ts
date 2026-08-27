import "server-only";
import { SITE } from "@/content/site";
import type { EnquiryInput } from "@/lib/leads/schema";

/**
 * Fire-and-forget alert to the KSF inbox.
 *
 * Deliberately never throws. The enquiry is already saved by the time this
 * runs, and losing a customer's message because a mail provider had a bad
 * afternoon is not an acceptable trade. Failures are logged and swallowed.
 *
 * Returns whether the alert actually went out, which the action uses only
 * as a last-resort check: if the database write failed *and* no mail went
 * out, the visitor must be told rather than shown a false success.
 */
export async function sendEnquiryAlert(lead: EnquiryInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_ALERT_TO ?? SITE.email;

  if (!apiKey || !from) {
    console.info("[enquiry] Resend not configured — alert email skipped.");
    return false;
  }

  const lines = [
    `Name:    ${lead.name}`,
    `Email:   ${lead.email}`,
    lead.phone ? `Phone:   ${lead.phone}` : null,
    lead.service ? `Service: ${lead.service}` : null,
    lead.sourcePath ? `Page:    ${lead.sourcePath}` : null,
    "",
    lead.message,
  ].filter(Boolean);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: lead.email,
        subject: `New enquiry — ${lead.name}${lead.service ? ` (${lead.service})` : ""}`,
        text: lines.join("\n"),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("[enquiry] Resend rejected the alert:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[enquiry] Alert email failed:", err);
    return false;
  }
}

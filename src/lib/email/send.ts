import "server-only";

/**
 * The one place that talks to Resend.
 *
 * Every message in this app goes through here so that the API key check,
 * the timeout, the error handling and the "not configured" behaviour are
 * defined once. Adding a new email should never mean rewriting any of
 * that.
 */

export type Mail = {
  to: string;
  subject: string;
  /** Plain text is required. It is what most clients actually render
   *  reliably, and it is the version that survives a spam filter. */
  text: string;
  /** Optional HTML. Kept deliberately simple — inline styles only, no
   *  external CSS, because email clients discard everything else. */
  html?: string;
  replyTo?: string;
};

export type SendResult = { sent: boolean; reason?: string };

/** Whether outbound email can work at all on this deployment. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Send one message.
 *
 * NEVER THROWS. Every caller runs after the thing that actually mattered
 * — an application stored, a decision recorded — has already succeeded.
 * A mail provider having a bad afternoon must not turn a saved
 * application into an error page.
 *
 * Returns whether it went out, so a caller that has no other record can
 * tell the user the truth.
 */
export async function send(mail: Mail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(
      `[email] Not configured — "${mail.subject}" to ${mail.to} was not sent.`,
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // The body carries Resend's reason — an unverified domain, a bad
      // key — and without it the log is useless for diagnosis.
      const detail = await res.text().catch(() => "");
      console.error(
        `[email] Resend rejected "${mail.subject}" (${res.status}): ${detail.slice(0, 300)}`,
      );
      return { sent: false, reason: `rejected-${res.status}` };
    }

    return { sent: true };
  } catch (err) {
    console.error(`[email] Failed sending "${mail.subject}":`, err);
    return { sent: false, reason: "network" };
  }
}

/**
 * Absolute base URL for links inside emails.
 *
 * A relative path is useless in an inbox, and getting this wrong means
 * sending applicants a status link that goes nowhere — so it is resolved
 * in one place and falls back loudly rather than silently.
 */
export function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel supplies this on every deployment.
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  console.warn(
    "[email] No NEXT_PUBLIC_SITE_URL set — links will point at localhost.",
  );
  return "http://localhost:3000";
}

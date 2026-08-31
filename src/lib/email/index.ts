import "server-only";
import { SITE } from "@/content/site";
import { getTrack } from "@/content/tracks";
import type { EnquiryInput } from "@/lib/leads/schema";
import { loadDictionaryFor, type Dictionary } from "@/lib/i18n/dictionary";
import { fill } from "@/lib/locale";
import { baseUrl, isEmailConfigured, send, type SendResult } from "./send";

export { isEmailConfigured } from "./send";

/**
 * Every message KSF sends.
 *
 * House style, applied throughout: plain sentences, no marketing voice,
 * and the single most useful thing near the top. Somebody reading a
 * decision on a phone should get the answer in the first line, not after
 * three paragraphs of preamble.
 */

const signOff = `${SITE.name}\n${SITE.email}\n${SITE.phoneUk}`;

/** Minimal HTML wrapper. Inline styles only — email clients bin the rest. */
function wrap(bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#14213d;max-width:34rem">
${bodyHtml}
<hr style="border:none;border-top:1px solid #d5dfec;margin:28px 0 16px">
<p style="font-size:13px;color:#53638a;margin:0">
  ${SITE.name}<br>
  <a href="mailto:${SITE.email}" style="color:#c8102e">${SITE.email}</a> · ${SITE.phoneUk}
</p>
</div>`;
}

/* ------------------------------------------------------------------ */
/* 1. Enquiry alert — to staff                                         */
/* ------------------------------------------------------------------ */

export async function sendEnquiryAlert(lead: EnquiryInput): Promise<boolean> {
  const to = process.env.EMAIL_ALERT_TO ?? SITE.email;

  const text = [
    `Name:    ${lead.name}`,
    `Email:   ${lead.email}`,
    lead.phone ? `Phone:   ${lead.phone}` : null,
    lead.service ? `Service: ${lead.service}` : null,
    lead.sourcePath ? `Page:    ${lead.sourcePath}` : null,
    "",
    lead.message,
    "",
    `Reply to this email to answer ${lead.name} directly.`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await send({
    to,
    subject: `New enquiry — ${lead.name}${lead.service ? ` (${lead.service})` : ""}`,
    text,
    // Replying to the alert should reach the person who wrote in, not us.
    replyTo: lead.email,
  });

  return res.sent;
}

/* ------------------------------------------------------------------ */
/* 2. Application received — to the applicant                          */
/* ------------------------------------------------------------------ */

export type ApplicationMail = {
  name: string;
  email: string;
  reference: string;
  courseSlug: string;
  /** Raw token path, e.g. /status/abc123. Empty if none was issued. */
  statusPath: string;
  /**
   * The language the applicant applied in.
   *
   * Applicant-facing mail is written in it. The staff alert below stays
   * in English deliberately — it goes to KSF, not to the applicant, and
   * translating an internal notification only makes it harder to scan.
   */
  locale?: string;
};

/**
 * The most important email in the product.
 *
 * The status link is stored only as a hash, so this message is the one
 * durable copy the applicant will ever have. If it does not arrive, the
 * only other place it existed was a browser tab they were told not to
 * close.
 */
export async function sendApplicationReceived(
  app: ApplicationMail,
): Promise<SendResult> {
  const t: Dictionary = await loadDictionaryFor(app.locale);
  const track = getTrack(app.courseSlug);
  const trackName = track?.name ?? app.courseSlug;
  const statusUrl = app.statusPath ? `${baseUrl()}${app.statusPath}` : null;
  const firstName = app.name.split(" ")[0];

  const e = t.email;
  const responseTime = t.common.responseTime;

  const text = [
    fill(e.greeting, { firstName }),
    "",
    fill(e.haveApplication, { track: trackName }),
    "",
    fill(e.quoteReference, { reference: app.reference }),
    "",
    statusUrl
      ? `${e.checkAnyTime}\n${statusUrl}\n\n${e.linkPrivate}`
      : fill(e.noLink, { email: SITE.email }),
    "",
    fill(e.whatNext, { responseTime }),
    "",
    signOff,
  ].join("\n");

  const html = wrap(`
<p style="margin:0 0 16px">${fill(e.greeting, { firstName })}</p>
<p style="margin:0 0 16px">${fill(e.haveApplication, { track: `<strong>${trackName}</strong>` })}</p>
<p style="margin:0 0 8px;font-size:13px;color:#53638a">${e.yourReference}</p>
<p style="margin:0 0 20px;font-family:ui-monospace,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:.04em">${app.reference}</p>
${
  statusUrl
    ? `<p style="margin:0 0 8px">${e.checkAnyTime}</p>
<p style="margin:0 0 8px"><a href="${statusUrl}" style="color:#c8102e;word-break:break-all">${statusUrl}</a></p>
<p style="margin:0 0 20px;font-size:13px;color:#53638a">${e.linkPrivate}</p>`
    : `<p style="margin:0 0 20px">${fill(e.noLink, {
        email: `<a href="mailto:${SITE.email}" style="color:#c8102e">${SITE.email}</a>`,
      })}</p>`
}
<p style="margin:0 0 16px">${fill(e.whatNext, { responseTime })}</p>`);

  return send({
    to: app.email,
    subject: fill(e.receivedSubject, { reference: app.reference }),
    text,
    html,
    replyTo: SITE.email,
  });
}

/* ------------------------------------------------------------------ */
/* 3. Application alert — to staff                                     */
/* ------------------------------------------------------------------ */

export async function sendApplicationAlert(
  app: ApplicationMail & { motivation: string },
): Promise<SendResult> {
  const to = process.env.EMAIL_ALERT_TO ?? SITE.email;
  const track = getTrack(app.courseSlug);

  const text = [
    `New application — ${app.reference}`,
    "",
    `Name:  ${app.name}`,
    `Email: ${app.email}`,
    `Track: ${track?.name ?? app.courseSlug}`,
    "",
    "Motivation:",
    app.motivation,
    "",
    `Review it: ${baseUrl()}/admin/applications`,
  ].join("\n");

  return send({
    to,
    subject: `New application — ${app.name} (${track?.shortName ?? app.courseSlug})`,
    text,
    replyTo: app.email,
  });
}

/* ------------------------------------------------------------------ */
/* 4. Decision — to the applicant                                      */
/* ------------------------------------------------------------------ */

export type Decision = "accepted" | "waitlisted" | "declined";

const DECISION_LINE: Record<Decision, string> = {
  accepted: "We would like to offer you a place.",
  waitlisted: "We have placed you on the waiting list.",
  declined: "We are not able to offer you a place this time.",
};

/**
 * Carries the written feedback, which is the promise the whole product
 * makes. The outcome is stated in the first line — nobody should have to
 * read three paragraphs to find out whether they got in.
 */
export async function sendDecision(
  app: ApplicationMail & { decision: Decision; feedback: string },
): Promise<SendResult> {
  const track = getTrack(app.courseSlug);
  const trackName = track?.name ?? app.courseSlug;
  const firstName = app.name.split(" ")[0];
  const statusUrl = app.statusPath ? `${baseUrl()}${app.statusPath}` : null;

  const text = [
    `Hello ${firstName},`,
    "",
    `${DECISION_LINE[app.decision]} (${trackName}, reference ${app.reference}.)`,
    "",
    "Our feedback:",
    "",
    app.feedback,
    "",
    app.decision === "accepted"
      ? "We will follow up with what happens next and how to start."
      : app.decision === "waitlisted"
        ? "If a place becomes available we will contact you before anyone else."
        : "You are welcome to apply again. The feedback above is meant to be useful, not final.",
    "",
    statusUrl ? `Your application: ${statusUrl}` : "",
    "",
    signOff,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const html = wrap(`
<p style="margin:0 0 16px">Hello ${firstName},</p>
<p style="margin:0 0 6px;font-size:17px;font-weight:600">${DECISION_LINE[app.decision]}</p>
<p style="margin:0 0 20px;font-size:13px;color:#53638a">${trackName} · ${app.reference}</p>
<p style="margin:0 0 8px;font-size:13px;color:#53638a">Our feedback</p>
<div style="margin:0 0 20px;padding:14px 16px;background:#f4f7fb;border-left:3px solid #c8102e;white-space:pre-wrap">${escapeHtml(app.feedback)}</div>
<p style="margin:0 0 16px">${
    app.decision === "accepted"
      ? "We will follow up with what happens next and how to start."
      : app.decision === "waitlisted"
        ? "If a place becomes available we will contact you before anyone else."
        : "You are welcome to apply again. The feedback above is meant to be useful, not final."
  }</p>
${statusUrl ? `<p style="margin:0 0 16px"><a href="${statusUrl}" style="color:#c8102e">View your application</a></p>` : ""}`);

  return send({
    to: app.email,
    subject: `Your application — ${app.reference}`,
    text,
    html,
    replyTo: SITE.email,
  });
}

/**
 * Feedback is staff-written free text going into an HTML email. Escaping
 * it is not optional: an unescaped angle bracket would break the layout,
 * and worse things are possible.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Re-exported so callers can ask before promising a user anything. */
export const emailReady = isEmailConfigured;

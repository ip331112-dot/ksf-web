import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { Check, Clock, MessageSquare, ShieldQuestion } from "lucide-react";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/content/site";
import { getTrack } from "@/content/tracks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your application",
  // Never index a page reached by secret token. Indexing one would put a
  // working status link into a search result.
  robots: { index: false, follow: false, nocache: true },
};

type Application = {
  id: string;
  reference: string;
  created_at: string;
  course_slug: string;
  name: string;
  status: string;
  paid_at: string | null;
};

type Feedback = { body: string; decided_at: string; sent_at: string | null };

/** The four stages an applicant sees, whatever the internal status is. */
const STAGES = ["Received", "Payment", "In review", "Decision"] as const;

function stageIndex(status: string): number {
  switch (status) {
    case "payment_pending":
      // Stuck at Received: the payment stage is the thing not yet done.
      return 0;
    case "submitted":
    case "in_review":
      // Payment is either settled or not required, so both land on review.
      return 2;
    case "accepted":
    case "waitlisted":
    case "declined":
    case "withdrawn":
      return 3;
    default:
      return 0;
  }
}

const DECIDED = new Set(["accepted", "waitlisted", "declined"]);

const OUTCOME: Record<string, { label: string; tone: string }> = {
  accepted: { label: "Offered a place", tone: "border-ok bg-ok-soft text-ok" },
  waitlisted: { label: "Waitlisted", tone: "border-warn bg-warn/10 text-warn" },
  declined: { label: "Not offered a place", tone: "border-red bg-red-soft text-red" },
  withdrawn: { label: "Withdrawn", tone: "border-line bg-surface-2 text-ink-faint" },
};

/**
 * Resolve a raw token to an application id, or null.
 *
 * Reading the clock is impure, so the expiry comparison lives here rather
 * than in the component body — React's purity rule rightly rejects
 * `Date.now()` during render, and the same reasoning already shapes the
 * admin queue's loader.
 */
async function resolveToken(
  supabase: ReturnType<typeof createAdminClient>,
  tokenHash: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("access_tokens")
    .select("application_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.application_id as string;
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Look up by hash. The raw token is never stored, so a leaked database
  // cannot be turned back into a working link.
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createAdminClient();

  // Unknown and expired are treated identically — telling someone which
  // it was confirms whether a guessed token ever existed.
  const applicationId = await resolveToken(supabase, tokenHash);
  if (!applicationId) notFound();

  const { data: app } = await supabase
    .from("applications")
    .select("id, reference, created_at, course_slug, name, status, paid_at")
    .eq("id", applicationId)
    .maybeSingle<Application>();

  if (!app) notFound();

  const { data: feedback } = await supabase
    .from("application_feedback")
    .select("body, decided_at, sent_at")
    .eq("application_id", app.id)
    .maybeSingle<Feedback>();

  await supabase
    .from("access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  const track = getTrack(app.course_slug);
  const reached = stageIndex(app.status);
  const decided = DECIDED.has(app.status) || app.status === "withdrawn";
  const outcome = OUTCOME[app.status];

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-3.5 lg:px-8">
          <KsfLogo />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <span className="eyebrow text-blue-lift">Your application</span>
        <h1 className="mt-3 font-mono text-2xl font-bold tracking-wide text-navy sm:text-3xl">
          {app.reference}
        </h1>
        <p className="mt-2 text-ink-dim">
          {track?.name ?? app.course_slug} · submitted{" "}
          {new Date(app.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        {outcome && (
          <span
            className={`mt-4 inline-block border px-3 py-1 font-mono text-[0.65rem] tracking-widest uppercase ${outcome.tone}`}
          >
            {outcome.label}
          </span>
        )}

        {/* Stages */}
        <ol className="mt-9 flex flex-col gap-0">
          {STAGES.map((stage, i) => {
            const done = i < reached || (i === reached && decided);
            const active = i === reached && !decided;
            return (
              <li key={stage} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      "flex h-7 w-7 shrink-0 items-center justify-center border " +
                      (done
                        ? "border-ok bg-ok-soft text-ok"
                        : active
                          ? "border-blue bg-blue text-white"
                          : "border-line text-ink-faint")
                    }
                  >
                    {done ? (
                      <Check size={14} aria-hidden="true" />
                    ) : active ? (
                      <Clock size={14} aria-hidden="true" />
                    ) : (
                      <span className="font-mono text-[0.7rem]">{i + 1}</span>
                    )}
                  </span>
                  {i < STAGES.length - 1 && (
                    <span
                      className={"w-px flex-1 " + (done ? "bg-ok/40" : "bg-line")}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="pb-7">
                  <p
                    className={
                      "font-display font-semibold " +
                      (done || active ? "text-navy" : "text-ink-faint")
                    }
                  >
                    {stage}
                  </p>
                  <p className="mt-0.5 text-[0.85rem] text-ink-dim">
                    {i === 0 && "We have your application."}
                    {i === 1 &&
                      (app.paid_at
                        ? "Payment confirmed."
                        : "No payment is required at this stage.")}
                    {i === 2 &&
                      (reached > 2
                        ? "Reviewed."
                        : `A person is reading it. We reply within ${SITE.responseTime}.`)}
                    {i === 3 &&
                      (decided
                        ? "A decision has been made — see below."
                        : "You will hear from us by email.")}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Feedback, once there is any */}
        {feedback ? (
          <section className="mt-4 border-2 border-blue bg-surface p-6">
            <div className="flex items-center gap-2">
              <MessageSquare size={17} className="text-blue-lift" aria-hidden="true" />
              <h2 className="font-display font-semibold text-navy">
                Your feedback from KSF
              </h2>
            </div>
            <p className="mt-1 font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">
              {new Date(feedback.decided_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-4 leading-relaxed whitespace-pre-wrap text-ink">
              {feedback.body}
            </p>
          </section>
        ) : (
          <section className="mt-4 border border-dashed border-line bg-surface-2 p-6">
            <p className="text-[0.875rem] text-ink-dim">
              Written feedback appears here once we have made a decision — you
              get it either way, not only if you are accepted.
            </p>
          </section>
        )}

        <section className="mt-10 border-t border-line pt-6">
          <div className="flex items-start gap-2.5">
            <ShieldQuestion size={17} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden="true" />
            <div>
              <h2 className="font-display font-semibold text-navy">Need something?</h2>
              <p className="mt-1.5 max-w-prose text-[0.875rem] leading-relaxed text-ink-dim">
                To ask about your application or to withdraw it, email{" "}
                <a href={`mailto:${SITE.email}`} className="font-semibold text-blue-lift hover:underline">
                  {SITE.email}
                </a>{" "}
                quoting {app.reference}. This link is private to you — treat it
                like a password.
              </p>
            </div>
          </div>
        </section>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-[0.875rem] font-semibold text-blue-lift hover:underline"
        >
          Back to the site
        </Link>
      </main>
    </>
  );
}

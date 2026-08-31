import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { SITE } from "@/content/site";
import { isEmailConfigured } from "@/lib/email";

export const metadata: Metadata = {
  title: "Application received",
  robots: { index: false, follow: false },
};

/**
 * Confirmation.
 *
 * The reference and the status link arrive as query parameters rather
 * than being re-read from the database, because there is no session to
 * prove who this visitor is — looking the application up would mean
 * trusting a reference anyone could guess. The link is single-use
 * knowledge passed straight from the submission.
 *
 * While Resend is unconfigured nothing is emailed, so this page is the
 * ONLY place the status link appears. It says so, loudly.
 */
export default async function ApplySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; status?: string }>;
}) {
  const { ref, status } = await searchParams;
  const reference = typeof ref === "string" ? ref : null;
  const statusPath =
    typeof status === "string" && status.startsWith("/status/") ? status : null;

  // Whether we actually emailed them changes what this page should say.
  // Telling someone to check an inbox nothing was sent to is how a
  // status link gets lost for good.
  const emailOn = isEmailConfigured();

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-3.5 lg:px-8">
          <KsfLogo />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={26} className="mt-1 shrink-0 text-ok" aria-hidden="true" />
          <div>
            <h1 className="font-display text-3xl font-extrabold text-navy sm:text-4xl">
              Application received
            </h1>
            <p className="mt-3 text-ink-dim">
              Thank you. We read every application ourselves and will reply
              within {SITE.responseTime}.
            </p>
          </div>
        </div>

        {reference && (
          <div className="mt-8 border-2 border-navy bg-surface p-6">
            <p className="font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">
              Your reference
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-wide text-navy sm:text-3xl">
              {reference}
            </p>
            <p className="mt-2 text-[0.85rem] text-ink-dim">
              Quote this if you contact us about your application.
            </p>
          </div>
        )}

        {statusPath ? (
          <div className="mt-6 border border-blue bg-blue/5 p-6">
            <div className="flex items-start gap-2.5">
              <Link2 size={18} className="mt-0.5 shrink-0 text-blue-lift" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="font-display font-semibold text-navy">
                  Your private status link
                </h2>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-dim">
                  <strong className="font-semibold text-navy">
                    Save this now — it is shown once and nowhere else.
                  </strong>{" "}
                  It is the only way to check your application without
                  contacting us, and we cannot recover it for you, only issue a
                  new one.
                </p>
                <Link
                  href={statusPath}
                  className="mt-3 block overflow-x-auto border border-line bg-surface px-3 py-2.5 font-mono text-[0.78rem] break-all text-blue-lift hover:underline"
                >
                  {statusPath}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex gap-3 border border-warn/40 bg-warn/5 p-5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <p className="text-[0.875rem] leading-relaxed text-ink-dim">
              <strong className="font-semibold text-navy">
                We could not create your status link.
              </strong>{" "}
              Your application is safely recorded — this only affects the
              self-service page. Email {SITE.email} with your reference and we
              will send you one.
            </p>
          </div>
        )}

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-navy">
            What happens next
          </h2>
          <ol className="mt-4 flex flex-col gap-3">
            {[
              "We read your application in full — a person, not a filter.",
              `We reply within ${SITE.responseTime} with a decision and written feedback, whichever way it goes.`,
              "If we offer you a place, that email explains exactly how to start.",
            ].map((line, i) => (
              <li key={line} className="flex items-start gap-3 text-[0.9rem] text-ink-dim">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-line font-mono text-[0.7rem] text-ink-faint">
                  {i + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-display font-semibold text-navy">
            {emailOn ? "Check your email" : "Nothing arrived by email?"}
          </h2>
          <p className="mt-2 max-w-prose text-[0.875rem] leading-relaxed text-ink-dim">
            {emailOn ? (
              <>
                We have sent a confirmation with your reference and the status
                link above. If it has not arrived in a few minutes, check your
                spam folder — and if it is not there either, email{" "}
                <a
                  href={`mailto:${SITE.email}`}
                  className="font-semibold text-blue-lift hover:underline"
                >
                  {SITE.email}
                </a>{" "}
                with your reference.
              </>
            ) : (
              <>
                We are not sending confirmation emails yet, so this page is your
                only record — that is why the link above matters. If you lose
                it, email{" "}
                <a
                  href={`mailto:${SITE.email}`}
                  className="font-semibold text-blue-lift hover:underline"
                >
                  {SITE.email}
                </a>{" "}
                with your reference.
              </>
            )}
          </p>
        </section>

        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 border border-line px-5 py-3 font-semibold text-ink-dim transition-colors hover:border-blue hover:text-blue-lift"
        >
          Back to the site
        </Link>
      </main>
    </>
  );
}

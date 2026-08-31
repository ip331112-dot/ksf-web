import type { Metadata } from "next";
import { Link } from "@/components/i18n/Link";
import { CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { SITE } from "@/content/site";
import { isEmailConfigured } from "@/lib/email";
import { getDictionary } from "../../dictionaries";
import { fill } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.meta.successTitle,
    robots: { index: false, follow: false },
  };
}

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
  const t = await getDictionary();
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
              {t.success.title}
            </h1>
            <p className="mt-3 text-ink-dim">
              {fill(t.success.intro, { responseTime: t.common.responseTime })}
            </p>
          </div>
        </div>

        {reference && (
          <div className="mt-8 border-2 border-navy bg-surface p-6">
            <p className="font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">
              {t.success.yourReference}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-wide text-navy sm:text-3xl">
              {reference}
            </p>
            <p className="mt-2 text-[0.85rem] text-ink-dim">
              {t.success.quoteIt}
            </p>
          </div>
        )}

        {statusPath ? (
          <div className="mt-6 border border-blue bg-blue/5 p-6">
            <div className="flex items-start gap-2.5">
              <Link2 size={18} className="mt-0.5 shrink-0 text-blue-lift" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="font-display font-semibold text-navy">
                  {t.success.statusTitle}
                </h2>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-dim">
                  <strong className="font-semibold text-navy">
                    {t.success.saveNow}
                  </strong>{" "}
                  {t.success.statusBody}
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
                {t.success.noLinkTitle}
              </strong>{" "}
              {fill(t.success.noLinkBody, { email: SITE.email })}
            </p>
          </div>
        )}

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-navy">
            {t.success.whatNext}
          </h2>
          <ol className="mt-4 flex flex-col gap-3">
            {[
              t.success.next1,
              fill(t.success.next2, { responseTime: t.common.responseTime }),
              t.success.next3,
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
            {emailOn ? t.success.checkEmail : t.success.noEmailTitle}
          </h2>
          <p className="mt-2 max-w-prose text-[0.875rem] leading-relaxed text-ink-dim">
            {fill(emailOn ? t.success.emailSentBody : t.success.noEmailBody, {
              email: SITE.email,
            })}
          </p>
        </section>

        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 border border-line px-5 py-3 font-semibold text-ink-dim transition-colors hover:border-blue hover:text-blue-lift"
        >
          {t.success.backToSite}
        </Link>
      </main>
    </>
  );
}

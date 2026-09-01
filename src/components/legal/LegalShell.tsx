import { Link } from "@/components/i18n/Link";
import { FileText } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE } from "@/content/site";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { fill } from "@/lib/locale";

/**
 * Shared shell for the four legal routes.
 *
 * These pages exist now so nothing in the footer dead-ends, but the binding
 * wording is deliberately NOT written by Claude. Terms, privacy and refund
 * policies are legal instruments; drafting them from a template and putting
 * a real trader's name on them is how businesses end up bound to terms they
 * have not read and cannot meet.
 *
 * They must carry real wording, reviewed by someone qualified, before live
 * payments are switched on in stage 4. Each page states its own status
 * honestly rather than pretending to be complete.
 */
export async function LegalShell({
  title,
  summary,
  covers,
}: {
  title: string;
  summary: string;
  covers: string[];
}) {
  const t = await getDictionary();

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">{t.legal.eyebrow}</span>
            <h1 className="mt-3 text-4xl font-extrabold text-balance text-navy">
              {title}
            </h1>
            <p className="mt-5 text-lg text-ink-dim">{summary}</p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
          <div className="flex gap-3 border border-warn/40 bg-warn/5 p-5">
            <FileText size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <div>
              <p className="font-display font-semibold text-navy">
                {t.legal.inPreparation}
              </p>
              <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-dim">
                {fill(t.legal.inPreparationBody, { email: SITE.email })}
              </p>
            </div>
          </div>

          <h2 className="mt-10 font-display text-lg font-semibold text-navy">
            {t.legal.willCover}
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {covers.map((c) => (
              <li key={c} className="flex gap-2.5 text-[0.9rem] text-ink-dim">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 bg-blue"
                  aria-hidden="true"
                />
                {c}
              </li>
            ))}
          </ul>

          <p className="mt-10 border-t border-line pt-6 text-[0.85rem] text-ink-faint">
            {fill(t.legal.tradingAs, {
              tradingName: SITE.tradingName,
              tradingAddress: SITE.tradingAddress,
            })}{" "}
            <Link href="/contact" className="font-semibold text-blue-lift hover:underline">
              {t.legal.contactUs}
            </Link>
            .
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

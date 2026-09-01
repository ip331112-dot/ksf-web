import type { Metadata } from "next";
import { Link } from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check } from "lucide-react";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ApplyFlow } from "@/components/apply/ApplyFlow";
import { applyRequiresPayment } from "@/lib/applications/actions";
import { TRACKS, getTrack, INCLUDED, PRICE_GBP } from "@/content/tracks";
import { getDictionary } from "../../../dictionaries";
import { fill } from "@/lib/locale";

/**
 * The application flow.
 *
 * Deliberately not wrapped in SiteHeader: the layout doc calls for a
 * minimal header with no navigation, because every link in a full nav is
 * an invitation to abandon halfway through. Logo and progress only.
 */

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TRACKS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) return {};

  const t = await getDictionary();

  return {
    title: fill(t.meta.applyTitle, { track: track.shortName }),
    description: fill(t.meta.applyDescription, { track: track.name }),
    // A form has nothing to offer a search result, and indexing it would
    // compete with the track page that should rank instead.
    robots: { index: false, follow: true },
  };
}

export default async function ApplyPage({ params }: Params) {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) notFound();

  const t = await getDictionary();
  const paymentRequired = await applyRequiresPayment();

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
          <KsfLogo />
          {/*
            The flow has no site nav by design, but it still needs a way
            to change language: everything here is translated, and an
            applicant who arrives in the wrong one would otherwise have
            to leave the form to fix it. The draft is keyed by track, not
            by locale, so switching keeps their answers.
          */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher label={t.nav.language} />
            <Link
              href={`/tracks/${track.slug}`}
              className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-ink-dim hover:text-blue-lift"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {fill(t.apply.backTo, { track: track.shortName })}
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-4xl px-5 py-10 lg:px-8 lg:py-14">
        <span className="eyebrow text-blue-lift">
          {fill(t.apply.applyEyebrow, { examCode: track.examCode })}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-balance text-navy sm:text-4xl">
          {track.name}
        </h1>
        <p className="mt-4 max-w-2xl text-ink-dim">
          {fill(t.apply.intro, { responseTime: t.common.responseTime })}
        </p>

        <ApplyFlow
          courseSlug={track.slug}
          trackName={track.shortName}
          priceGbp={PRICE_GBP}
          paymentRequired={paymentRequired}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          t={{ apply: t.apply, errors: t.errors }}
        />

        <aside className="mt-12 border-t border-line pt-8">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-start gap-2 text-[0.8rem] text-ink-dim">
              <BadgeCheck size={15} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
              {paymentRequired
                ? t.apply.refundReassurance
                : t.apply.freeReassurance}
            </div>
            {INCLUDED.slice(0, 3).map((item) => (
              <div key={item} className="flex items-start gap-2 text-[0.8rem] text-ink-dim">
                <Check size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </aside>
      </main>
    </>
  );
}

import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { Link } from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X, Clock, BarChart3, BadgeCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import { SITE } from "@/content/site";
import {
  TRACKS,
  getTrack,
  tracksInOrder,
  INCLUDED,
  NOT_INCLUDED,
  PRICE_GBP,
} from "@/content/tracks";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TRACKS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) return {};

  return {
    title: `${track.name} (${track.examCode})`,
    description: track.summary,
    alternates: await alternatesFor(`/tracks/${slug}`),
  };
}

export default async function TrackPage({ params }: Params) {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) notFound();

  const related = tracksInOrder()
    .filter((t) => t.slug !== track.slug)
    .filter((t) => t.vendor === track.vendor || t.level === track.level)
    .slice(0, 3);

  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* 01 · Breadcrumb */}
        <nav aria-label="Breadcrumb" className="border-b border-line bg-surface-2">
          <ol className="mx-auto flex max-w-6xl gap-2 px-5 py-3 font-mono text-[0.72rem] text-ink-faint lg:px-8">
            <li><Link href="/" className="hover:text-blue-lift">Home</Link></li>
            <li aria-hidden>›</li>
            <li><Link href="/tracks" className="hover:text-blue-lift">Tracks</Link></li>
            <li aria-hidden>›</li>
            <li className="text-ink" aria-current="page">{track.shortName}</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-10 py-14 lg:grid-cols-[1.7fr_1fr] lg:items-start">
            {/* 02 · Hero */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow border border-line bg-surface-2 px-2.5 py-1 text-ink-dim">
                  {track.vendor}
                </span>
                <span className="tabular font-mono text-[0.72rem] text-ink-faint">
                  Exam {track.examCode}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold text-navy sm:text-4xl lg:text-[2.75rem]">
                {track.name}
              </h1>

              <p className="mt-5 text-lg text-ink-dim">{track.summary}</p>

              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
                <div className="flex items-center gap-2.5">
                  <BarChart3 size={17} className="text-blue-lift" />
                  <div>
                    <dt className="eyebrow text-ink-faint">Level</dt>
                    <dd className="text-[0.9rem] font-medium text-navy">{track.level}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock size={17} className="text-blue-lift" />
                  <div>
                    <dt className="eyebrow text-ink-faint">Guided hours</dt>
                    <dd className="tabular text-[0.9rem] font-medium text-navy">
                      ~{track.hours}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <BadgeCheck size={17} className="text-blue-lift" />
                  <div>
                    <dt className="eyebrow text-ink-faint">Response</dt>
                    <dd className="text-[0.9rem] font-medium text-navy">
                      {SITE.responseTime}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {/* 03 · Apply card — sticky on desktop */}
            <aside className="lg:sticky lg:top-24">
              <div className="border border-line bg-surface p-6">
                <p className="flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-navy">
                    £{PRICE_GBP}
                  </span>
                  <span className="text-ink-dim">/ month</span>
                </p>
                <p className="mt-1.5 text-[0.85rem] text-ink-dim">
                  Rolling monthly. Cancel any time.
                </p>

                <Link
                  href={`/tracks/${track.slug}/apply`}
                  className="mt-5 flex w-full items-center justify-center gap-2 bg-blue px-6 py-3.5 font-semibold text-white transition-colors hover:bg-navy-3"
                >
                  Apply for this course
                  <ArrowRight size={16} />
                </Link>

                <div className="mt-4 flex items-start gap-2 border border-ok/30 bg-ok-soft p-3">
                  <BadgeCheck size={15} className="mt-0.5 shrink-0 text-ok" />
                  <p className="text-[0.8rem] leading-relaxed text-ink">
                    Not accepted? Your subscription is cancelled and refunded in full,
                    automatically.
                  </p>
                </div>

                <ul className="mt-5 flex flex-col gap-2 border-t border-line-soft pt-5">
                  {INCLUDED.slice(0, 4).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[0.83rem]">
                      <Check size={14} className="mt-1 shrink-0 text-ok" />
                      <span className="text-ink-dim">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>

          {/* 05 + 06 · Who it is for, prerequisites */}
          <div className="grid gap-6 border-t border-line py-14 lg:grid-cols-2">
            <section>
              <h2 className="font-display text-xl font-semibold text-navy">
                Who this is for
              </h2>
              <p className="mt-3 text-ink-dim">{track.audience}</p>
            </section>
            <section>
              <h2 className="font-display text-xl font-semibold text-navy">
                What you need first
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {track.prerequisites.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[0.925rem]">
                    <Check size={15} className="mt-1.5 shrink-0 text-blue-lift" />
                    <span className="text-ink-dim">{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 07 · Syllabus */}
          <section className="border-t border-line py-14">
            <h2 className="font-display text-2xl font-bold text-navy">
              What the course covers
            </h2>
            <p className="mt-2 max-w-2xl text-ink-dim">
              Structured around the {track.vendor} exam blueprint for {track.examCode}.
              Domain weightings are the vendor&apos;s; the descriptions are ours.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {track.domains.map((d, i) => (
                <details
                  key={d.title}
                  className="group border border-line bg-surface p-5 open:border-blue"
                  open={i === 0}
                >
                  <summary className="cursor-pointer list-none marker:content-none">
                    <span className="flex items-start justify-between gap-4">
                      <span className="font-display text-[1rem] font-semibold text-navy">
                        {d.title}
                      </span>
                      <span className="tabular shrink-0 font-mono text-[0.75rem] text-blue-lift">
                        {d.weight}
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2.5 text-[0.9rem] text-ink-dim">{d.blurb}</p>
                </details>
              ))}
            </div>
          </section>

          {/* 08 + 09 · Included / not included */}
          <div className="grid gap-6 border-t border-line py-14 lg:grid-cols-2">
            <section>
              <h2 className="font-display text-xl font-semibold text-navy">
                What £{PRICE_GBP} a month includes
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.925rem]">
                    <Check size={16} className="mt-1 shrink-0 text-ok" />
                    <span className="text-ink-dim">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-navy">
                What it does not include
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {NOT_INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.925rem]">
                    <X size={16} className="mt-1 shrink-0 text-red" />
                    <span className="text-ink-dim">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[0.83rem] text-ink-faint">
                {track.vendor} publishes the authoritative exam objectives, pricing and
                booking process. We prepare you for it; they examine you.
              </p>
            </section>
          </div>

          {/* 11 · Related */}
          {related.length > 0 && (
            <section className="border-t border-line py-14">
              <h2 className="font-display text-xl font-semibold text-navy">
                Related courses
              </h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                {related.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/tracks/${t.slug}`}
                      className="group flex h-full flex-col border border-line bg-surface p-5 transition-colors hover:border-blue"
                    >
                      <span className="eyebrow text-ink-faint">{t.vendor}</span>
                      <h3 className="mt-2 font-display font-semibold text-navy">
                        {t.shortName}
                      </h3>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue-lift">
                        View course
                        <ArrowRight
                          size={13}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}

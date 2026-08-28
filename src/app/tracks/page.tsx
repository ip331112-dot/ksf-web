import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import { tracksInOrder, PRICE_GBP } from "@/content/tracks";

export const metadata: Metadata = {
  title: "Certification tracks",
  description:
    "Eight certification preparation tracks covering CompTIA, Cisco and EC-Council exams. One subscription, mentored support, £10 a month.",
};

export default function TracksPage() {
  const tracks = tracksInOrder();

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">Certification tracks</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-navy sm:text-5xl">
              Every track, one subscription
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              Each track follows the vendor&apos;s published exam blueprint and is
              mentored by someone who has sat the exam. Applications are reviewed
              individually — pick the track that matches where you are now, not where
              you would like to be.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tracks/${t.slug}`}
                  className="group flex h-full flex-col border border-line bg-surface p-6 transition-colors hover:border-blue"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="eyebrow text-ink-faint">{t.vendor}</span>
                    <span className="tabular font-mono text-[0.7rem] text-ink-faint">
                      {t.examCode}
                    </span>
                  </div>

                  <h2 className="mt-4 font-display text-lg font-semibold text-navy">
                    {t.shortName}
                  </h2>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-dim">
                    {t.summary}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-line-soft pt-4">
                    <span className="font-mono text-[0.72rem] text-ink-faint">
                      {t.level} · {t.hours}h
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue-lift">
                      From £{PRICE_GBP}
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Not sure which track? */}
          <div className="mt-10 flex flex-col items-start gap-4 border border-line bg-surface-2 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <HelpCircle size={20} className="mt-0.5 shrink-0 text-blue-lift" />
              <div>
                <h2 className="font-display text-lg font-semibold text-navy">
                  Not sure which track fits?
                </h2>
                <p className="mt-1 text-[0.9rem] text-ink-dim">
                  Tell us where you are and what you are aiming at. We will point you at
                  the right one — including if that means waiting.
                </p>
              </div>
            </div>
            <Link
              href="/contact"
              className="shrink-0 border border-navy px-6 py-3 font-semibold text-navy transition-colors hover:bg-navy hover:text-ground"
            >
              Ask us
            </Link>
          </div>
        </section>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}

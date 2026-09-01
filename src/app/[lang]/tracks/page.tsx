import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { Link } from "@/components/i18n/Link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import { tracksInOrder, PRICE_GBP } from "@/content/tracks";
import { getDictionary } from "../dictionaries";
import { fill } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.meta.tracksTitle,
    description: fill(t.meta.tracksDescription, { price: PRICE_GBP }),
    alternates: await alternatesFor("/tracks"),
  };
}

export default async function TracksPage() {
  const t = await getDictionary();
  const tracks = tracksInOrder();

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">{t.tracks.eyebrow}</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-navy sm:text-5xl">
              {t.tracks.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              {t.tracks.intro}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => (
              <li key={track.slug}>
                <Link
                  href={`/tracks/${track.slug}`}
                  className="group flex h-full flex-col border border-line bg-surface p-6 transition-colors hover:border-blue"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="eyebrow text-ink-faint">{track.vendor}</span>
                    <span className="tabular font-mono text-[0.7rem] text-ink-faint">
                      {track.examCode}
                    </span>
                  </div>

                  <h2 className="mt-4 font-display text-lg font-semibold text-navy">
                    {track.shortName}
                  </h2>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-dim">
                    {track.summary}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-line-soft pt-4">
                    <span className="font-mono text-[0.72rem] text-ink-faint">
                      {track.level} · {track.hours}h
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue-lift">
                      {fill(t.tracks.from, { price: PRICE_GBP })}
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
                  {t.tracks.notSureTitle}
                </h2>
                <p className="mt-1 text-[0.9rem] text-ink-dim">
                  {t.tracks.notSureBody}
                </p>
              </div>
            </div>
            <Link
              href="/contact"
              className="shrink-0 border border-navy px-6 py-3 font-semibold text-navy transition-colors hover:bg-navy hover:text-ground"
            >
              {t.tracks.askUs}
            </Link>
          </div>
        </section>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}

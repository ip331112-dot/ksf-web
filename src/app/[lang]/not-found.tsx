import { Link } from "@/components/i18n/Link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TRACKS } from "@/content/tracks";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Branded 404. Several navigation targets (about, pricing, legal, the apply
 * flow) are scheduled for later stages and do not exist yet, so this page
 * has to do real work rather than dead-end the visitor.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <p className="font-mono text-xs tracking-[0.2em] text-blue-lift uppercase">
          Error 404
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-extrabold text-balance text-navy sm:text-4xl">
          We could not find that page
        </h1>
        <p className="mt-4 max-w-prose text-ink-dim">
          It may have moved, or the link may be wrong. Some sections of this site are
          still being built and will open shortly.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRACKS.slice(0, 4).map((t) => (
            <Link
              key={t.slug}
              href={`/tracks/${t.slug}`}
              className="group border border-line bg-surface p-4 transition-colors hover:border-blue"
            >
              <span className="font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">
                {t.vendor}
              </span>
              <span className="mt-1 block font-display font-semibold text-navy">
                {t.name}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-sm text-blue-lift">
                View course
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-lift"
          >
            Back to home
          </Link>
          <Link
            href="/tracks"
            className="inline-flex items-center gap-2 border border-line px-6 py-3 font-semibold text-navy transition-colors hover:border-navy"
          >
            All eight courses
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

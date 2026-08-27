import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check, Clock } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EnquiryForm } from "@/components/contact/EnquiryForm";
import { isLeadPipelineReady } from "@/lib/supabase/admin";
import { SITE } from "@/content/site";
import { TRACKS, getTrack, INCLUDED, PRICE_GBP } from "@/content/tracks";

/**
 * Interim apply page.
 *
 * The real four-step flow with Stripe Checkout is stage three. Until it
 * exists, "Apply for this track" — the primary call to action on every
 * track page — pointed at a route that did not exist and returned a 404.
 * Eight dead links, all of them on the one button someone presses when
 * they have decided to give KSF money.
 *
 * So this page stands in: it says plainly that online applications are not
 * open, sets out what will happen when they are, and takes the enquiry
 * through the pipeline that does work, tagged to this track. Replace it
 * with the real flow rather than extending it.
 */

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TRACKS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) return {};

  return {
    title: `Apply — ${track.shortName}`,
    description: `Register your interest in the ${track.name} track with KSF Tech Services. £${PRICE_GBP} a month.`,
    // Not a page to rank for: it is a placeholder, and the real apply flow
    // will own this URL shortly.
    robots: { index: false, follow: true },
  };
}

export default async function ApplyPage({ params }: Params) {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) notFound();

  const pipelineReady = isLeadPipelineReady();

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
            <Link
              href={`/tracks/${track.slug}`}
              className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-blue hover:underline"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to {track.shortName}
            </Link>

            <span className="eyebrow mt-6 block text-blue">Apply</span>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold text-balance text-navy sm:text-5xl">
              {track.name}
            </h1>

            <div className="mt-6 flex max-w-2xl gap-3 border border-warn/40 bg-warn/5 p-4">
              <Clock
                size={18}
                className="mt-0.5 shrink-0 text-warn"
                aria-hidden="true"
              />
              <p className="text-[0.9rem] leading-relaxed text-ink-dim">
                <strong className="font-semibold text-navy">
                  Online applications are not open yet.
                </strong>{" "}
                We are finishing the application and payment process. Register
                your interest below and we will come back to you personally —
                you will not be charged anything now.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div>
              <h2 className="text-2xl font-extrabold text-navy">
                Register your interest
              </h2>
              <p className="mt-3 max-w-xl text-ink-dim">
                Tell us a little about where you are starting from. We reply
                within {SITE.responseTime}, and we will let you know as soon as
                applications open for {track.shortName}.
              </p>

              <EnquiryForm
                sourcePath={`/tracks/${track.slug}/apply`}
                defaultService="training"
                turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                pipelineReady={pipelineReady}
              />
            </div>

            <aside className="flex h-fit flex-col gap-4">
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

                <div className="mt-4 flex items-start gap-2 border border-ok/30 bg-ok-soft p-3">
                  <BadgeCheck
                    size={15}
                    className="mt-0.5 shrink-0 text-ok"
                    aria-hidden="true"
                  />
                  <p className="text-[0.8rem] leading-relaxed text-ink">
                    Not accepted? Your subscription is cancelled and refunded in
                    full, automatically.
                  </p>
                </div>

                <ul className="mt-5 flex flex-col gap-2 border-t border-line-soft pt-5">
                  {INCLUDED.slice(0, 4).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[0.83rem]">
                      <Check size={14} className="mt-1 shrink-0 text-ok" aria-hidden="true" />
                      <span className="text-ink-dim">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

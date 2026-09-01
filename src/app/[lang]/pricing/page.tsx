import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { fill } from "@/lib/locale";
import { Link } from "@/components/i18n/Link";
import { ArrowRight, Check, X } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE } from "@/content/site";
import { INCLUDED, NOT_INCLUDED, PRICE_GBP } from "@/content/tracks";
import { FAQ_GROUPS } from "@/content/faq";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.meta.pricingTitle,
    description: fill(t.meta.pricingDescription, { price: PRICE_GBP }),
    alternates: await alternatesFor("/pricing"),
  };
}

const billing = FAQ_GROUPS.find((g) => g.id === "payment")!;

/**
 * Pricing exists to remove fear, not to sell. Because KSF charges before
 * deciding, "not included" is given the same visual weight as "included",
 * and the refund promise is stated in full rather than linked to.
 */
export default function PricingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">Pricing</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-balance text-navy sm:text-5xl">
              One price, every track
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              No tiers, no bundles, no discount that expires at midnight. One
              subscription covers all eight certification tracks.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            {/* The card */}
            <div className="h-fit border-2 border-blue bg-surface p-7">
              <p className="eyebrow text-blue-lift">All-access</p>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-extrabold text-navy">
                  £{PRICE_GBP}
                </span>
                <span className="text-ink-dim">/ month</span>
              </p>
              <p className="mt-2 text-sm text-ink-dim">
                Rolling monthly. Cancel any time. Priced in pounds sterling.
              </p>
              <Link
                href="/tracks"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-blue px-6 py-3.5 font-semibold text-white transition-colors hover:bg-blue-lift"
              >
                Choose a track
                <ArrowRight size={17} />
              </Link>
              <p className="mt-4 border-t border-line pt-4 text-[0.8rem] leading-relaxed text-ink-dim">
                Free to browse. You only pay when you submit an application — and
                if we cannot offer you a place, that payment comes straight back.
              </p>
            </div>

            {/* Included / not included, equal weight on purpose */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-line bg-surface p-6">
                <h2 className="font-display font-semibold text-navy">
                  What is included
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.875rem] text-ink-dim">
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-ok"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-line bg-surface p-6">
                <h2 className="font-display font-semibold text-navy">
                  What is not included
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {NOT_INCLUDED.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.875rem] text-ink-dim">
                      <X
                        size={16}
                        className="mt-0.5 shrink-0 text-red"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-line pt-4 text-[0.8rem] leading-relaxed text-ink-dim">
                  Exam vouchers are priced by the awarding body and usually run to
                  several hundred pounds. Budget for that separately.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The refund promise, in full — not a link to Terms */}
        <section className="border-y border-line bg-ok-soft">
          <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
            <h2 className="max-w-3xl text-2xl font-extrabold text-balance text-navy">
              Not accepted? You are refunded in full, automatically.
            </h2>
            <p className="mt-4 max-w-prose text-ink-dim">
              Your £{PRICE_GBP} is taken when you apply, because every application
              is read by a person and answered with written feedback. If we decide
              we cannot offer you a place, we cancel the subscription and refund
              the payment in the same moment — you never have to ask, chase, or
              fill in a form. We respond within {SITE.responseTime}.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <h2 className="text-2xl font-extrabold text-navy">Billing questions</h2>
          <div className="mt-6 max-w-3xl divide-y divide-line border border-line bg-surface">
            {billing.items.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none font-display font-semibold text-navy marker:content-none">
                  {item.q}
                </summary>
                <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ink-dim">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink-dim">
            More in the{" "}
            <Link href="/faq" className="font-semibold text-blue-lift hover:underline">
              full FAQ
            </Link>
            .
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

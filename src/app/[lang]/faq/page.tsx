import type { Metadata } from "next";
import { Link } from "@/components/i18n/Link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import { FAQ_GROUPS, ALL_FAQS } from "@/content/faq";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Straight answers on paying to apply, refunds, how the training works, and what the exams involve.",
};

/**
 * Answers live in <details> rather than a JS accordion so every answer is
 * in the HTML at first paint — crawlable, and works without JavaScript.
 * The payment group is first and open by default: the awkward question
 * gets answered before it is asked.
 */
export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">FAQ</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-balance text-navy sm:text-5xl">
              Questions, answered plainly
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              Including the ones that are awkward for us. If something here is
              unclear,{" "}
              <Link href="/contact" className="font-semibold text-blue-lift hover:underline">
                ask us directly
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
          <nav aria-label="FAQ sections" className="mb-10 flex flex-wrap gap-2">
            {FAQ_GROUPS.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="border border-line px-3 py-1.5 text-[0.8rem] font-medium text-ink-dim transition-colors hover:border-blue hover:text-blue-lift"
              >
                {g.title}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-12">
            {FAQ_GROUPS.map((group, gi) => (
              <div key={group.id} id={group.id} className="scroll-mt-24">
                <h2 className="font-display text-xl font-extrabold text-navy">
                  {group.title}
                </h2>
                <div className="mt-4 divide-y divide-line border border-line bg-surface">
                  {group.items.map((item, i) => (
                    <details
                      key={item.q}
                      open={gi === 0 && i === 0}
                      className="px-5 py-4"
                    >
                      <summary className="cursor-pointer list-none font-display font-semibold text-navy marker:content-none">
                        {item.q}
                      </summary>
                      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ink-dim">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import { SERVICES, SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Cyber security, IT support, network solutions, data protection and consulting from KSF Tech Services.",
};

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">Services</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-navy sm:text-5xl">
              {SITE.strapline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              Five services for organisations that need their systems to hold. We
              deliver reliable technology that protects, empowers and connects your
              world.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className="group flex h-full flex-col border border-line bg-surface p-6 transition-colors hover:border-blue"
                >
                  <h2 className="font-display text-lg font-semibold text-navy">
                    {s.name}
                  </h2>
                  <p className="mt-1 text-[0.8rem] font-medium text-blue-lift">{s.tagline}</p>
                  <p className="mt-3 flex-1 text-[0.875rem] leading-relaxed text-ink-dim">
                    {s.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue-lift">
                    Learn more
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}

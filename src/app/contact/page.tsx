import type { Metadata } from "next";
import { Phone, Mail, Globe } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EnquiryForm } from "@/components/contact/EnquiryForm";
import { isLeadPipelineReady } from "@/lib/supabase/admin";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Talk to KSF Tech Services about cyber security, IT support, networks, data protection or consulting. ${SITE.coverage}.`,
};

/**
 * The form goes live on its own the moment SUPABASE_SERVICE_ROLE_KEY
 * exists — until then it refuses input and shows the direct routes,
 * because accepting a message with nowhere to put it is the worst
 * possible outcome for an enquiry.
 */
export default function ContactPage() {
  const pipelineReady = isLeadPipelineReady();

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">Contact</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-balance text-navy sm:text-5xl">
              Talk to us
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              About a service, a project, or which certification track fits you.
              We answer within {SITE.responseTime}.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-extrabold text-navy">Send an enquiry</h2>

              <EnquiryForm
                sourcePath="/contact"
                turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                pipelineReady={pipelineReady}
              />
            </div>

            {/* Direct routes */}
            <aside className="flex h-fit flex-col gap-4">
              <div className="border-2 border-blue bg-surface p-6">
                <h2 className="font-display font-semibold text-navy">
                  Reach us directly
                </h2>
                <p className="mt-1 text-[0.8rem] text-ink-dim">
                  These work right now.
                </p>
                <ul className="mt-4 flex flex-col gap-3 text-[0.875rem]">
                  <li className="flex items-center gap-2.5">
                    <Mail size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    <a href={`mailto:${SITE.email}`} className="text-ink-dim hover:text-blue-lift">
                      {SITE.email}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Mail size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    <a href={`mailto:${SITE.emailAlt}`} className="text-ink-dim hover:text-blue-lift">
                      {SITE.emailAlt}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    <a
                      href={`tel:${SITE.phoneUk.replace(/\s/g, "")}`}
                      className="text-ink-dim hover:text-blue-lift"
                    >
                      {SITE.phoneUk} <span className="text-ink-faint">(UK)</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    <a
                      href={`tel:${SITE.phoneFr.replace(/\s/g, "")}`}
                      className="text-ink-dim hover:text-blue-lift"
                    >
                      {SITE.phoneFr} <span className="text-ink-faint">(FR)</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5 text-ink-dim">
                    <Globe size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    {SITE.coverage}
                  </li>
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

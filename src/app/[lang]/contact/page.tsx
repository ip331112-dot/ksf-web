import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { Phone, Mail, Globe } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EnquiryForm } from "@/components/contact/EnquiryForm";
import { isLeadPipelineReady } from "@/lib/supabase/admin";
import { SITE } from "@/content/site";
import { getDictionary } from "../dictionaries";
import { enquiryStrings } from "@/lib/i18n/strings";
import { fill } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.meta.contactTitle,
    description: fill(t.meta.contactDescription, { coverage: t.common.coverage }),
    alternates: await alternatesFor("/contact"),
  };
}

/**
 * The form goes live on its own the moment SUPABASE_SERVICE_ROLE_KEY
 * exists — until then it refuses input and shows the direct routes,
 * because accepting a message with nowhere to put it is the worst
 * possible outcome for an enquiry.
 */
export default async function ContactPage() {
  const t = await getDictionary();
  const pipelineReady = isLeadPipelineReady();

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">{t.contact.eyebrow}</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-balance text-navy sm:text-5xl">
              {t.contact.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              {fill(t.contact.intro, { responseTime: t.common.responseTime })}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-extrabold text-navy">{t.contact.sendEnquiry}</h2>

              <EnquiryForm
                sourcePath="/contact"
                turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                pipelineReady={pipelineReady}
                t={enquiryStrings(t)}
              />
            </div>

            {/* Direct routes */}
            <aside className="flex h-fit flex-col gap-4">
              <div className="border-2 border-blue bg-surface p-6">
                <h2 className="font-display font-semibold text-navy">
                  {t.contact.reachUs}
                </h2>
                <p className="mt-1 text-[0.8rem] text-ink-dim">
                  {t.contact.reachUsNote}
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
                    {t.common.coverage}
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

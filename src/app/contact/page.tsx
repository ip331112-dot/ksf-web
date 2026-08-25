import type { Metadata } from "next";
import { Phone, Mail, Globe, AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE, SERVICES } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Talk to KSF Tech Services about cyber security, IT support, networks, data protection or consulting. ${SITE.coverage}.`,
};

/**
 * The form markup is real and validated by the browser, but it cannot be
 * submitted yet: the server action needs SUPABASE_SERVICE_ROLE_KEY, Resend
 * and Turnstile, none of which exist. Rather than accept a message and
 * silently drop it — the worst possible outcome for an enquiry — the
 * submit control is disabled and the phone and email routes are given
 * equal prominence.
 *
 * Stage 2 Track B replaces `disabled` with the server action.
 */
const PIPELINE_READY = false;

export default function ContactPage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue">Contact</span>
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

              {!PIPELINE_READY && (
                <div className="mt-5 flex gap-3 border border-warn/40 bg-warn/5 p-4">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-warn"
                    aria-hidden="true"
                  />
                  <p className="text-[0.875rem] leading-relaxed text-ink-dim">
                    <strong className="font-semibold text-navy">
                      This form is not live yet.
                    </strong>{" "}
                    We are still connecting it, and we would rather tell you than
                    take your message and lose it. Please email{" "}
                    <a
                      href={`mailto:${SITE.email}`}
                      className="font-semibold text-blue hover:underline"
                    >
                      {SITE.email}
                    </a>{" "}
                    or call us — both reach us today.
                  </p>
                </div>
              )}

              <form className="mt-6 flex flex-col gap-4" aria-describedby="form-state">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className="text-[0.8rem] font-semibold text-navy">
                      Your name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      disabled={!PIPELINE_READY}
                      className="border border-line bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30 disabled:bg-surface-2 disabled:text-ink-faint"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-[0.8rem] font-semibold text-navy">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      disabled={!PIPELINE_READY}
                      className="border border-line bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30 disabled:bg-surface-2 disabled:text-ink-faint"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="phone" className="text-[0.8rem] font-semibold text-navy">
                      Phone <span className="font-normal text-ink-faint">(optional)</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      maxLength={40}
                      autoComplete="tel"
                      disabled={!PIPELINE_READY}
                      className="border border-line bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30 disabled:bg-surface-2 disabled:text-ink-faint"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="service" className="text-[0.8rem] font-semibold text-navy">
                      What is this about?
                    </label>
                    <select
                      id="service"
                      name="service"
                      defaultValue=""
                      disabled={!PIPELINE_READY}
                      className="border border-line bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30 disabled:bg-surface-2 disabled:text-ink-faint"
                    >
                      <option value="">Select…</option>
                      {SERVICES.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.name}
                        </option>
                      ))}
                      <option value="training">Certification training</option>
                      <option value="other">Something else</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="message" className="text-[0.8rem] font-semibold text-navy">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    minLength={10}
                    maxLength={4000}
                    rows={6}
                    disabled={!PIPELINE_READY}
                    className="resize-y border border-line bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30 disabled:bg-surface-2 disabled:text-ink-faint"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={!PIPELINE_READY}
                    className="inline-flex items-center gap-2 bg-blue px-6 py-3.5 font-semibold text-white transition-colors hover:bg-blue-lift disabled:cursor-not-allowed disabled:bg-ink-faint"
                  >
                    Send enquiry
                  </button>
                  <p id="form-state" className="mt-2.5 text-[0.8rem] text-ink-faint">
                    {PIPELINE_READY
                      ? "We reply to every enquiry."
                      : "Sending is disabled until this form is connected. Use email or phone."}
                  </p>
                </div>
              </form>
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
                    <Mail size={15} className="shrink-0 text-blue" aria-hidden="true" />
                    <a href={`mailto:${SITE.email}`} className="text-ink-dim hover:text-blue">
                      {SITE.email}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Mail size={15} className="shrink-0 text-blue" aria-hidden="true" />
                    <a href={`mailto:${SITE.emailAlt}`} className="text-ink-dim hover:text-blue">
                      {SITE.emailAlt}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone size={15} className="shrink-0 text-blue" aria-hidden="true" />
                    <a
                      href={`tel:${SITE.phoneUk.replace(/\s/g, "")}`}
                      className="text-ink-dim hover:text-blue"
                    >
                      {SITE.phoneUk} <span className="text-ink-faint">(UK)</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone size={15} className="shrink-0 text-blue" aria-hidden="true" />
                    <a
                      href={`tel:${SITE.phoneFr.replace(/\s/g, "")}`}
                      className="text-ink-dim hover:text-blue"
                    >
                      {SITE.phoneFr} <span className="text-ink-faint">(FR)</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5 text-ink-dim">
                    <Globe size={15} className="shrink-0 text-blue" aria-hidden="true" />
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

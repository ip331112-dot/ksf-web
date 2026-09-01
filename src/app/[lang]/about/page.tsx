import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { Phone, Mail, Globe } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import { SITE, SERVICES } from "@/content/site";
import { TRACKS, PRICE_GBP } from "@/content/tracks";

export async function generateMetadata(): Promise<Metadata> {
  return {
  title: "About",
  description:
    "KSF Tech Services is a working security firm. The certification training exists because this is what we do every day.",
    alternates: await alternatesFor("/about"),
  };
}

/**
 * ⚠️ CREDENTIALS NOT SUPPLIED.
 *
 * A credibility page should name real people and real qualifications. KSF
 * has not provided them, and inventing a founder biography or a list of
 * certifications would be a fabrication a customer could rely on when
 * deciding to pay.
 *
 * So the section is omitted rather than faked. Fill this in and it renders
 * automatically; leave it null and the page simply does not make the claim.
 */
const CREDENTIALS: { heading: string; body: string; items: string[] } | null = null;

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">About</span>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold text-balance text-navy sm:text-5xl">
              A working security firm that teaches
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              KSF Tech Services protects, supports and connects organisations that
              cannot afford for their systems to fail. The certification training
              exists because this is the work we do every day.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              <h2 className="text-2xl font-extrabold text-balance text-navy">
                Why we train as well as deliver
              </h2>
              <p className="text-ink-dim">
                Most certification training is written by people who teach for a
                living. Ours is shaped by people who spend their week doing the
                work the exam describes — hardening networks, responding to
                incidents, and explaining to organisations why the thing they were
                told was fine is not fine.
              </p>
              <p className="text-ink-dim">
                That is the whole argument for KSF as a place to prepare. We are
                not a course marketplace reselling someone else&apos;s material. We
                are practitioners, and the training is structured around the
                vendors&apos; published exam blueprints with mentoring from people
                who have sat those exams.
              </p>
              <h2 className="mt-4 text-2xl font-extrabold text-balance text-navy">
                Why applications are read by a person
              </h2>
              <p className="text-ink-dim">
                Anyone can take money and hand over a login. We would rather know
                that the track you picked is the right one for where you actually
                are, because someone set loose on an advanced track without the
                groundwork does not fail gracefully — they lose months.
              </p>
              <p className="text-ink-dim">
                So every application gets read and answered within{" "}
                {SITE.responseTime}, with written feedback rather than silence. If
                the answer is no, the £{PRICE_GBP} comes straight back
                automatically. If a different track suits you better, we say so.
              </p>

              {CREDENTIALS && (
                <>
                  <h2 className="mt-4 text-2xl font-extrabold text-balance text-navy">
                    {CREDENTIALS.heading}
                  </h2>
                  <p className="text-ink-dim">{CREDENTIALS.body}</p>
                  <ul className="flex flex-col gap-2">
                    {CREDENTIALS.items.map((c) => (
                      <li key={c} className="text-ink-dim">
                        {c}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <aside className="flex h-fit flex-col gap-4">
              <div className="border border-line bg-surface p-6">
                <h2 className="font-display font-semibold text-navy">
                  What we do
                </h2>
                <ul className="mt-3 flex flex-col gap-1.5 text-[0.875rem] text-ink-dim">
                  {SERVICES.map((s) => (
                    <li key={s.slug}>{s.name}</li>
                  ))}
                  <li>{TRACKS.length} certification training tracks</li>
                </ul>
              </div>

              <div className="border border-line bg-surface p-6">
                <h2 className="font-display font-semibold text-navy">Reach us</h2>
                <ul className="mt-3 flex flex-col gap-2.5 text-[0.875rem] text-ink-dim">
                  <li className="flex items-center gap-2.5">
                    <Mail size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    <a href={`mailto:${SITE.email}`} className="hover:text-blue-lift">
                      {SITE.email}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    <a
                      href={`tel:${SITE.phoneUk.replace(/\s/g, "")}`}
                      className="hover:text-blue-lift"
                    >
                      {SITE.phoneUk} <span className="text-ink-faint">(UK)</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    <a
                      href={`tel:${SITE.phoneFr.replace(/\s/g, "")}`}
                      className="hover:text-blue-lift"
                    >
                      {SITE.phoneFr} <span className="text-ink-faint">(FR)</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Globe size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    {SITE.coverage}
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}

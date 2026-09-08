import type { Metadata } from "next";
import { Link } from "@/components/i18n/Link";
import { alternatesFor } from "@/lib/i18n/alternates";
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  Lock,
  Rocket,
  Check,
  BadgeCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import Image from "next/image";
import { CoursePanel } from "@/components/brand/CoursePanel";
import { SITE, PROMISES, HOW_IT_WORKS, SERVICES } from "@/content/site";
import { tracksInOrder, INCLUDED, NOT_INCLUDED, PRICE_GBP } from "@/content/tracks";
import { getDictionary } from "./dictionaries";
import { fill } from "@/lib/locale";

const PROMISE_ICONS = [ShieldCheck, Clock, Lock, Rocket];

const FAQ = [
  {
    q: "What happens if you do not accept my application?",
    a: `Your subscription is cancelled and the £${PRICE_GBP} is refunded in full, automatically, the moment we make that decision. You do not have to ask, and you do not have to chase us.`,
  },
  {
    q: "Why do I pay before you decide?",
    a: "It keeps the intake small enough that every application is read properly by a person and gets written feedback. If we cannot offer you a place, you are refunded — so the only thing you risk is the time it takes to apply.",
  },
  {
    q: "How quickly will I hear back?",
    a: `We respond within ${SITE.responseTime}. You will get a decision and written feedback either way — we do not leave applications unanswered.`,
  },
  {
    q: "Is the exam voucher included?",
    a: "No. Exam vouchers are bought directly from CompTIA, Cisco or EC-Council. We prepare you for the exam; the exam itself is sat with the vendor.",
  },
  {
    q: "Do I need experience before applying?",
    a: "It depends on the course. The foundation courses assume general IT familiarity and nothing more. The advanced courses genuinely expect prior experience — each course page lists its prerequisites honestly.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, at any time, from the billing portal. It is a rolling monthly subscription with no minimum term.",
  },
];

/**
 * Title and description come from the root layout; only the canonical
 * has to be stated here, because a layout cannot know the path.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { alternates: await alternatesFor("") };
}

export default async function HomePage() {
  const t = await getDictionary();
  const tracks = tracksInOrder();

  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* 02 · Hero */}
        <section className="bg-navy-grad">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:px-8 lg:py-28">
            <div>
              <span className="eyebrow inline-flex items-center gap-2 bg-blue px-3 py-1.5 text-white">
                <ShieldCheck size={13} />
                {t.home.kicker}
              </span>

              <h1 className="hero-title mt-6">
                {fill(t.home.strapline, { price: PRICE_GBP })}
              </h1>

              <p className="mt-5 max-w-xl text-lg text-white/75">
                {fill(t.home.intro, { price: PRICE_GBP })}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/tracks"
                  className="inline-flex items-center justify-center gap-2 bg-blue px-7 py-4 font-semibold text-white transition-colors hover:bg-blue-lift"
                >
                  {t.home.browseTracks}
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center border border-white/25 px-7 py-4 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {t.home.talkToUs}
                </Link>
              </div>

              <p className="eyebrow mt-7 text-blue-lift">{SITE.tagline}</p>

              {/*
                The owner's flyer, exactly as supplied — no crop, no
                recolour, no overlay. `public/ksf-flyer.jpg` is a byte-for-byte
                copy of flyer.jpg.

                alt="" because the flyer is decorative here: everything it
                says already exists on the page as real text — the services
                below, the tagline above it, the phone numbers and addresses
                in the footer. A description would make a screen reader
                announce all of it a second time, and any wording baked in
                here would be English on the French page.
              */}
              <Image
                src="/ksf-flyer.jpg"
                alt=""
                width={1024}
                height={576}
                className="mt-6 h-auto w-full"
              />
            </div>

            <div className="hidden justify-center lg:flex">
              <CoursePanel />
            </div>
          </div>
        </section>

        {/* 03 · Trust strip */}
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
            {PROMISES.map((p, i) => {
              const Icon = PROMISE_ICONS[i];
              return (
                <div key={p.title} className="flex items-start gap-3">
                  <Icon size={20} className="mt-0.5 shrink-0 text-blue-lift" />
                  <div>
                    <h3 className="text-[0.95rem] font-semibold text-navy">{p.title}</h3>
                    <p className="text-[0.85rem] text-ink-dim">{p.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 04 · Certification courses */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <span className="eyebrow text-blue-lift">{t.home.tracksEyebrow}</span>
            <h2 className="mt-3 text-3xl font-extrabold text-navy sm:text-4xl">
              Eight courses. One subscription.
            </h2>
            <p className="mt-4 text-ink-dim">
              Every course is structured around the vendor&apos;s published exam blueprint
              and mentored by someone who has sat it. Pick the one that matches where
              you are now.
            </p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

                  <h3 className="mt-4 font-display text-lg font-semibold text-navy">
                    {track.shortName}
                  </h3>
                  <p className="mt-2 flex-1 text-[0.875rem] leading-relaxed text-ink-dim">
                    {track.audience}
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
        </section>

        {/* 05 · How it works */}
        <section className="border-y border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
            <div className="max-w-2xl">
              <span className="eyebrow text-blue-lift">{t.home.howEyebrow}</span>
              <h2 className="mt-3 text-3xl font-extrabold text-navy sm:text-4xl">
                Apply, and get a real answer
              </h2>
            </div>

            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((s) => (
                <li key={s.step} className="border-t-2 border-blue pt-4">
                  <span className="font-mono text-[0.72rem] tracking-widest text-blue-lift">
                    {s.step}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-semibold text-navy">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[0.875rem] text-ink-dim">{s.body}</p>
                </li>
              ))}
            </ol>

            {/* 05b · The refund reassurance line — deliberately prominent */}
            <div className="mt-10 flex items-start gap-3 border border-ok/30 bg-ok-soft p-5">
              <BadgeCheck size={20} className="mt-0.5 shrink-0 text-ok" />
              <p className="text-[0.925rem] text-ink">
                <strong className="font-semibold">
                  Not accepted? You are refunded in full, automatically.
                </strong>{" "}
                We cancel the subscription and return the £{PRICE_GBP} the moment we make
                that decision — you never have to ask.
              </p>
            </div>
          </div>
        </section>

        {/* 06 · Services */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <span className="eyebrow text-blue-lift">{t.home.servicesEyebrow}</span>
            <h2 className="mt-3 text-3xl font-extrabold text-navy sm:text-4xl">
              KSF is a working security firm
            </h2>
            <p className="mt-4 text-ink-dim">
              The training exists because this is what we do every day. Five services,
              delivered to organisations that need their systems to hold.
            </p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group flex h-full flex-col border border-line bg-surface p-6 transition-colors hover:border-blue"
                >
                  <h3 className="font-display text-lg font-semibold text-navy">
                    {service.name}
                  </h3>
                  <p className="mt-1 text-[0.8rem] font-medium text-blue-lift">{service.tagline}</p>
                  <p className="mt-3 flex-1 text-[0.875rem] leading-relaxed text-ink-dim">
                    {service.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue-lift">
                    {t.common.readMore}
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

        {/* 07 + 08 · Why KSF, and pricing */}
        <section className="border-y border-line bg-surface-2">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1.4fr_1fr] lg:px-8">
            <div>
              <span className="eyebrow text-blue-lift">{t.home.whyEyebrow}</span>
              <h2 className="mt-3 text-3xl font-extrabold text-navy sm:text-4xl">
                Small intake, real mentorship
              </h2>
              <p className="mt-5 text-ink-dim">
                Most certification training is a video library you buy and abandon. The
                completion rates are dismal and everyone in the industry knows it. We
                took the opposite approach: a small number of people at a time, each one
                reviewed and mentored by a practitioner.
              </p>
              <p className="mt-4 text-ink-dim">
                That is why there is an application rather than a checkout, and why the
                intake is deliberately limited. It is also why the price is £{PRICE_GBP} —
                the mentoring is the product, and it only works at a size we can honour.
              </p>
              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-1.5 font-semibold text-blue-lift hover:underline"
              >
                More about KSF
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="border border-line bg-surface p-7">
              <span className="eyebrow text-ink-faint">All-access</span>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="stat-figure">
                  £{PRICE_GBP}
                </span>
                <span className="text-ink-dim">{t.tracks.perMonth}</span>
              </p>
              <p className="mt-2 text-[0.85rem] text-ink-dim">
                {t.tracks.rolling}
              </p>

              <ul className="mt-6 flex flex-col gap-2.5 border-t border-line-soft pt-6">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.875rem]">
                    <Check size={16} className="mt-1 shrink-0 text-ok" />
                    <span className="text-ink-dim">{item}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 border-t border-line-soft pt-5 text-[0.8rem] text-ink-faint">
                Not included: {NOT_INCLUDED[0].toLowerCase()}
              </p>

              <Link
                href="/tracks"
                className="mt-6 flex w-full items-center justify-center gap-2 bg-blue px-6 py-3.5 font-semibold text-white transition-colors hover:bg-navy-3"
              >
                {t.home.browseTracks}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/*
          09 · Testimonials — deliberately omitted at launch.
          zSecurity leans on 845,200 students and 219 countries. KSF has no
          such numbers yet, and inventing them is both a trust risk and, for
          marketing claims, a legal one. This section returns when there are
          real reviews to show.
        */}

        {/* 10 · FAQ */}
        <section className="mx-auto max-w-3xl px-5 py-20 lg:py-24">
          <span className="eyebrow text-blue-lift">{t.home.questionsEyebrow}</span>
          <h2 className="mt-3 text-3xl font-extrabold text-navy sm:text-4xl">
            Before you apply
          </h2>

          <div className="mt-10 flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group border border-line bg-surface p-5 open:border-blue"
              >
                <summary className="cursor-pointer list-none font-display text-[1.02rem] font-semibold text-navy marker:content-none">
                  <span className="flex items-start justify-between gap-4">
                    {item.q}
                    <span className="mt-0.5 shrink-0 font-mono text-blue-lift transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-[0.925rem] leading-relaxed text-ink-dim">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}

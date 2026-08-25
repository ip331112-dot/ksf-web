import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Mail, Phone } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SERVICES, getService, SITE } from "@/content/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return { title: service.name, description: service.summary };
}

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const others = SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <>
      <SiteHeader />

      <main id="main">
        <nav aria-label="Breadcrumb" className="border-b border-line bg-surface-2">
          <ol className="mx-auto flex max-w-6xl gap-2 px-5 py-3 font-mono text-[0.72rem] text-ink-faint lg:px-8">
            <li><Link href="/" className="hover:text-blue">Home</Link></li>
            <li aria-hidden>›</li>
            <li><Link href="/services" className="hover:text-blue">Services</Link></li>
            <li aria-hidden>›</li>
            <li className="text-ink" aria-current="page">{service.name}</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr] lg:items-start">
            <div>
              <span className="eyebrow text-blue">{service.tagline}</span>
              <h1 className="mt-3 text-4xl font-extrabold text-navy sm:text-5xl">
                {service.name}
              </h1>
              <p className="mt-5 text-lg text-ink-dim">{service.summary}</p>

              <h2 className="mt-10 font-display text-xl font-semibold text-navy">
                What we deliver
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {service.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[0.95rem]">
                    <Check size={16} className="mt-1.5 shrink-0 text-blue" />
                    <span className="text-ink-dim">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/*
              Enquiry form — UI only at this stage.
              Wiring to the `leads` table via a server action, with zod
              validation, honeypot, Turnstile and rate limiting, is week 1.
            */}
            <aside className="border border-line bg-surface-2 p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-semibold text-navy">
                Talk to us about {service.name.toLowerCase()}
              </h2>
              <p className="mt-2 text-[0.875rem] text-ink-dim">
                Tell us what you need. We reply within {SITE.responseTime}.
              </p>

              <form className="mt-5 flex flex-col gap-3">
                <div>
                  <label htmlFor="name" className="eyebrow text-ink-faint">Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    className="mt-1.5 w-full border border-line bg-surface px-3 py-2.5 text-[0.9rem] outline-none focus:border-blue"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="eyebrow text-ink-faint">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="mt-1.5 w-full border border-line bg-surface px-3 py-2.5 text-[0.9rem] outline-none focus:border-blue"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="eyebrow text-ink-faint">
                    What do you need?
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="mt-1.5 w-full resize-y border border-line bg-surface px-3 py-2.5 text-[0.9rem] outline-none focus:border-blue"
                  />
                </div>
                <button
                  type="submit"
                  disabled
                  className="mt-1 flex items-center justify-center gap-2 bg-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-3 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Send enquiry
                </button>
                <p className="text-[0.72rem] text-ink-faint">
                  Form submission goes live once the backend is connected. In the
                  meantime, email or call us directly.
                </p>
              </form>

              <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-[0.85rem]">
                <a
                  href={`mailto:${SITE.email}`}
                  className="flex items-center gap-2 text-ink-dim hover:text-blue"
                >
                  <Mail size={14} className="text-blue" />
                  {SITE.email}
                </a>
                <a
                  href={`tel:${SITE.phoneUk.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-ink-dim hover:text-blue"
                >
                  <Phone size={14} className="text-blue" />
                  {SITE.phoneUk}
                </a>
              </div>
            </aside>
          </div>

          <section className="border-t border-line py-14">
            <h2 className="font-display text-xl font-semibold text-navy">
              Other services
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="group flex h-full flex-col border border-line bg-surface p-5 transition-colors hover:border-blue"
                  >
                    <h3 className="font-display font-semibold text-navy">{s.name}</h3>
                    <p className="mt-1 text-[0.78rem] text-ink-dim">{s.tagline}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue">
                      View
                      <ArrowRight
                        size={13}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

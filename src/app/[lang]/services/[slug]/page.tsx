import type { Metadata } from "next";
import { Link } from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Mail, Phone } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EnquiryForm } from "@/components/contact/EnquiryForm";
import { isLeadPipelineReady } from "@/lib/supabase/admin";
import { SERVICES, getService, SITE } from "@/content/site";
import { getDictionary } from "../../dictionaries";
import { enquiryStrings } from "@/lib/i18n/strings";

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

  const t = await getDictionary();
  const others = SERVICES.filter((s) => s.slug !== service.slug);
  const pipelineReady = isLeadPipelineReady();

  return (
    <>
      <SiteHeader />

      <main id="main">
        <nav aria-label="Breadcrumb" className="border-b border-line bg-surface-2">
          <ol className="mx-auto flex max-w-6xl gap-2 px-5 py-3 font-mono text-[0.72rem] text-ink-faint lg:px-8">
            <li><Link href="/" className="hover:text-blue-lift">Home</Link></li>
            <li aria-hidden>›</li>
            <li><Link href="/services" className="hover:text-blue-lift">Services</Link></li>
            <li aria-hidden>›</li>
            <li className="text-ink" aria-current="page">{service.name}</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr] lg:items-start">
            <div>
              <span className="eyebrow text-blue-lift">{service.tagline}</span>
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
                    <Check size={16} className="mt-1.5 shrink-0 text-blue-lift" />
                    <span className="text-ink-dim">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="border border-line bg-surface-2 p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-semibold text-navy">
                Talk to us about {service.name.toLowerCase()}
              </h2>
              <p className="mt-2 text-[0.875rem] text-ink-dim">
                Tell us what you need. We reply within {SITE.responseTime}.
              </p>

              <EnquiryForm
                variant="compact"
                sourcePath={`/services/${service.slug}`}
                defaultService={service.slug}
                turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                pipelineReady={pipelineReady}
                t={enquiryStrings(t)}
              />

              <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-[0.85rem]">
                <a
                  href={`mailto:${SITE.email}`}
                  className="flex items-center gap-2 text-ink-dim hover:text-blue-lift"
                >
                  <Mail size={14} className="text-blue-lift" />
                  {SITE.email}
                </a>
                <a
                  href={`tel:${SITE.phoneUk.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-ink-dim hover:text-blue-lift"
                >
                  <Phone size={14} className="text-blue-lift" />
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
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue-lift">
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

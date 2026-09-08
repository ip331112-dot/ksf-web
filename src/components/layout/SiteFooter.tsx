import { Link } from "@/components/i18n/Link";
import { Mail, Phone, Globe } from "lucide-react";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { SITE, SERVICES } from "@/content/site";
import { tracksInOrder } from "@/content/tracks";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SocialLinks } from "@/components/social/SocialLinks";

/**
 * Labels are dictionary keys rather than words, resolved in the
 * component below. Company links reuse the nav section — the same page
 * should not be named two different things in two places.
 */
const COMPANY = [
  { href: "/about", key: "about" },
  { href: "/faq", key: "faq" },
  { href: "/contact", key: "contact" },
] as const;

const LEGAL = [
  { href: "/terms", key: "terms" },
  { href: "/privacy", key: "privacy" },
  { href: "/refunds", key: "refunds" },
  { href: "/cookies", key: "cookies" },
] as const;

function Column({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="eyebrow mb-4 text-blue-lift">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[0.875rem] text-white/70 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function SiteFooter() {
  const t = await getDictionary();

  const tracks = tracksInOrder().map((track) => ({
    href: `/tracks/${track.slug}`,
    label: track.shortName,
  }));

  return (
    <footer className="bg-navy-grad text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <Column title={t.footer.tracks} links={tracks} />
          <Column
            title={t.footer.services}
            links={SERVICES.map((service) => ({
              href: `/services/${service.slug}`,
              label: service.name,
            }))}
          />
          <Column
            title={t.footer.company}
            links={COMPANY.map((l) => ({ href: l.href, label: t.nav[l.key] }))}
          />
          <Column
            title={t.footer.legal}
            links={LEGAL.map((l) => ({ href: l.href, label: t.footer[l.key] }))}
          />
        </div>

        {/* Contact strip */}
        <div className="mt-14 flex flex-col gap-5 border-t border-white/15 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <KsfLogo tone="dark" showTagline href={null} />
            <div className="flex items-center gap-4">
              <SocialLinks label={t.footer.followUs} tone="dark" />
              <LanguageSwitcher label={t.nav.language} tone="dark" />
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-7 gap-y-2.5 text-[0.85rem] text-white/70">
            <li className="flex items-center gap-2">
              <Mail size={14} className="text-blue-lift" />
              <a href={`mailto:${SITE.email}`} className="hover:text-white">
                {SITE.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={14} className="text-blue-lift" />
              <a href={`tel:${SITE.phoneUk.replace(/\s/g, "")}`} className="hover:text-white">
                {SITE.phoneUk}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={14} className="text-blue-lift" />
              <a href={`tel:${SITE.phoneFr.replace(/\s/g, "")}`} className="hover:text-white">
                {SITE.phoneFr}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Globe size={14} className="text-blue-lift" />
              {t.common.coverage}
            </li>
          </ul>
        </div>

        {/* Legal base bar */}
        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-[0.75rem] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.tradingName} {t.footer.tradingAs}{" "}
            {SITE.name}. {SITE.tradingAddress}
          </p>
          <p className="font-mono tracking-wide">
            {t.footer.trademarks}
          </p>
        </div>
      </div>
    </footer>
  );
}

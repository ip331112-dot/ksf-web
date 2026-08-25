import Link from "next/link";
import { Mail, Phone, Globe } from "lucide-react";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { SITE, SERVICES } from "@/content/site";
import { tracksInOrder } from "@/content/tracks";

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const LEGAL = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refund policy" },
  { href: "/cookies", label: "Cookies" },
];

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

export function SiteFooter() {
  const tracks = tracksInOrder().map((t) => ({
    href: `/tracks/${t.slug}`,
    label: t.shortName,
  }));

  return (
    <footer className="bg-navy-grad text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <Column title="Tracks" links={tracks} />
          <Column
            title="Services"
            links={SERVICES.map((s) => ({
              href: `/services/${s.slug}`,
              label: s.name,
            }))}
          />
          <Column title="Company" links={COMPANY} />
          <Column title="Legal" links={LEGAL} />
        </div>

        {/* Contact strip */}
        <div className="mt-14 flex flex-col gap-5 border-t border-white/15 pt-8">
          <KsfLogo tone="dark" showTagline href={null} />

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
              {SITE.coverage}
            </li>
          </ul>
        </div>

        {/* Legal base bar */}
        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-[0.75rem] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.tradingName} trading as {SITE.name}.{" "}
            {SITE.tradingAddress}
          </p>
          <p className="font-mono tracking-wide">
            CompTIA, Cisco and EC-Council are trademarks of their respective owners.
            KSF provides exam preparation and is not an accredited partner.
          </p>
        </div>
      </div>
    </footer>
  );
}

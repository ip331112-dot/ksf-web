import { Link } from "@/components/i18n/Link";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { NAV } from "@/content/site";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";

/**
 * A Server Component, so the nav labels come straight from the
 * dictionary with no translation payload shipped to the browser. The two
 * genuinely interactive pieces — the mobile toggle and the language
 * switcher — are client islands nested inside it.
 */
export async function SiteHeader() {
  const t = await getDictionary();

  const items = NAV.map((item) => ({
    href: item.href,
    label: t.nav[item.key],
    staff: "staff" in item && item.staff,
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5 lg:px-8">
        <KsfLogo />

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.staff
                  ? // Quieter, and set off by a rule: it is a door for
                    // KSF, not a page a customer wants.
                    "border-l border-line pl-7 text-[0.85rem] font-medium text-ink-faint transition-colors hover:text-blue-lift"
                  : "text-[0.925rem] font-medium text-ink-dim transition-colors hover:text-blue-lift"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher label={t.nav.language} />

          {/* The CTA never collapses — it stays a button on mobile */}
          <Link
            href="/tracks"
            className="inline-flex items-center bg-blue px-4 py-2.5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-navy-3 sm:px-5"
          >
            {t.nav.applyNow}
          </Link>

          <MobileNav
            items={items}
            openLabel={t.nav.openMenu}
            closeLabel={t.nav.closeMenu}
          />
        </div>
      </div>
    </header>
  );
}

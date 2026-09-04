import { Link } from "@/components/i18n/Link";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import type { Locale } from "@/lib/locale";
import { t, type ShopCategory } from "@/lib/shop/schema";

/**
 * The category rail.
 *
 * A vertical line with a tick per row, filled red icon, muted label —
 * the arrangement the owner specified from a reference. The line breaks
 * between groups rather than running straight through, because the break
 * is what separates gear from everything else.
 *
 * "All" is rendered here but is not a category row: it is the unfiltered
 * view. Storing it would mean special-casing it in every query and every
 * count for the life of the shop.
 */
export function ShopSidebar({
  categories,
  active,
  locale,
  title,
  allLabel,
}: {
  categories: ShopCategory[];
  /** Slug of the current category, or null on /shop. */
  active: string | null;
  locale: Locale;
  title: string;
  allLabel: string;
}) {
  // Group by `grp`, preserving the order the query returned.
  const groups = categories.reduce<Map<number, ShopCategory[]>>((acc, c) => {
    const list = acc.get(c.grp) ?? [];
    list.push(c);
    acc.set(c.grp, list);
    return acc;
  }, new Map());

  return (
    <nav aria-label={title} className="lg:sticky lg:top-6">
      <h2 className="mb-4 font-display text-xl font-semibold text-navy">{title}</h2>

      {[...groups.entries()].map(([grp, items]) => (
        <ul key={grp} className="mb-6 border-l border-line last:mb-0">
          {items.map((c) => (
            <Row
              key={c.id}
              href={`/shop/category/${c.slug}`}
              icon={c.icon}
              label={t(c, "name", locale)}
              current={active === c.slug}
            />
          ))}
        </ul>
      ))}

      <ul className="border-l border-line">
        <Row href="/shop" icon="bag" label={allLabel} current={active === null} />
      </ul>
    </nav>
  );
}

function Row({
  href,
  icon,
  label,
  current,
}: {
  href: string;
  icon: string;
  label: string;
  current: boolean;
}) {
  return (
    <li className="relative">
      {/* The tick joining the rail to the row. Marked hidden: it is a
          drawn connector, and a screen reader announcing it would be
          noise between every menu item. */}
      <span
        aria-hidden="true"
        className={
          "absolute top-1/2 left-0 h-px w-4 " + (current ? "bg-blue" : "bg-line")
        }
      />
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={
          "flex items-center gap-4 py-3 pl-6 text-[1.02rem] transition-colors " +
          (current ? "font-semibold text-navy" : "text-ink-dim hover:text-navy")
        }
      >
        <CategoryIcon name={icon} size={21} className="shrink-0 text-blue" />
        {label}
      </Link>
    </li>
  );
}

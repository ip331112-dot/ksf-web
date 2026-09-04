/**
 * The shop's category icons.
 *
 * WHY THESE ARE HAND-DRAWN RATHER THAN lucide-react
 * The rest of the site uses lucide, which is an outline set. The shop
 * menu was specified from a reference that uses FILLED glyphs, and a
 * filled icon cannot be faked by thickening an outline one. So these
 * eight are drawn here and maintained by us, and the shop is the one
 * place on the site where icons are solid. That is a deliberate
 * exception, not an oversight — if the decision is reversed, delete this
 * file and swap to the lucide equivalents named against each glyph.
 *
 * Names are stored in `shop_categories.icon` as plain strings, so a
 * category added through the admin form picks one of these by name. An
 * unknown name falls back to the bag rather than rendering nothing.
 */

export const CATEGORY_ICONS = {
  gift: "Gift",       // lucide: Gift
  wifi: "Wi-Fi",      // lucide: Wifi
  mask: "Mask",       // lucide: VenetianMask
  lock: "Padlock",    // lucide: Lock
  mug: "Mug",         // lucide: Coffee
  tie: "Tie",         // lucide: Shirt
  book: "Book",       // lucide: Book
  bag: "Bag",         // lucide: ShoppingBag
  cpu: "Chip",        // lucide: Cpu
  key: "Key",         // lucide: KeyRound
} as const;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export const isCategoryIcon = (v: string): v is CategoryIconName =>
  Object.hasOwn(CATEGORY_ICONS, v);

/**
 * The gift ribbon is cut out with the page colour rather than drawn as a
 * gap, because an SVG `fill-rule` cannot punch a stripe through two
 * overlapping rectangles. `--icon-cut` therefore has to match whatever
 * sits behind the icon; it defaults to the page ground.
 */
const PATHS: Record<CategoryIconName, React.ReactNode> = {
  gift: (
    <>
      <rect x="3" y="7.6" width="18" height="4" rx=".6" />
      <rect x="4.9" y="12.6" width="14.2" height="9.4" rx=".6" />
      <path d="M8.7 1.8a2.9 2.9 0 0 0 0 5.8h2.4V6.4C11.1 4 10 1.8 8.7 1.8zm6.6 0c1.3 0 .1 2.2-2.4 4.6v1.2h2.4a2.9 2.9 0 0 0 0-5.8z" />
      <rect
        x="10.75"
        y="5.8"
        width="2.5"
        height="16.4"
        fill="var(--icon-cut, var(--color-ground))"
      />
    </>
  ),
  wifi: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M2.6 8.9a14 14 0 0 1 18.8 0" />
      <path d="M6 12.5a9 9 0 0 1 12 0" />
      <path d="M9.4 16.1a4.2 4.2 0 0 1 5.2 0" />
      <circle cx="12" cy="19.6" r=".9" fill="currentColor" stroke="none" />
    </g>
  ),
  mask: (
    <path
      fillRule="evenodd"
      d="M2 7.2c0-.7.5-1.2 1.2-1.2H7c2 0 3.8.8 5 2.1 1.2-1.3 3-2.1 5-2.1h3.8c.7 0 1.2.5 1.2 1.2v4.4c0 3.1-2.6 5.7-5.7 5.7-1.9 0-3.5.7-4.3 1.8-.8-1.1-2.4-1.8-4.3-1.8A5.7 5.7 0 0 1 2 11.6V7.2zm4.6 3.1a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zm10.8 0a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z"
    />
  ),
  lock: (
    <>
      <path d="M12 1.9A5.1 5.1 0 0 0 6.9 7v2.9h2.4V7a2.7 2.7 0 0 1 5.4 0v2.9h2.4V7A5.1 5.1 0 0 0 12 1.9z" />
      <rect x="3.9" y="9.9" width="16.2" height="11.2" rx="1.8" />
    </>
  ),
  mug: (
    <>
      <path d="M2.9 4.9h14.4v8.6a5.4 5.4 0 0 1-5.4 5.4H8.3a5.4 5.4 0 0 1-5.4-5.4V4.9z" />
      <path
        d="M17.9 7.2h1.2a3.4 3.4 0 0 1 0 6.8h-1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
      />
      <rect x="2" y="19.8" width="16.2" height="2.1" rx="1" />
    </>
  ),
  tie: (
    <>
      <path d="M9.4 1.9h5.2l1.3 3.3L14 8.2h-4L8.1 5.2z" />
      <path d="M10.1 9.4h3.8l1.9 8.4L12 22.3l-3.8-4.5z" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.6A2.6 2.6 0 0 1 6.6 2H20v15.1H6.6A2.6 2.6 0 0 0 4 19.7V4.6z" />
      <path d="M6.6 18.6H20V22H6.6a1.7 1.7 0 0 1 0-3.4z" />
    </>
  ),
  bag: (
    <path
      fillRule="evenodd"
      d="M8.1 6.9V6a3.9 3.9 0 1 1 7.8 0v.9h3.2c.5 0 1 .4 1 .9l1.1 12.1c.1 1.1-.8 2.1-2 2.1H4.8c-1.2 0-2.1-1-2-2.1L3.9 7.8c0-.5.5-.9 1-.9h3.2zm2 0h3.8V6a1.9 1.9 0 1 0-3.8 0v.9z"
    />
  ),
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.4" />
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9.5 2v3M12 2v3M14.5 2v3M9.5 19v3M12 19v3M14.5 19v3" />
        <path d="M2 9.5h3M2 12h3M2 14.5h3M19 9.5h3M19 12h3M19 14.5h3" />
      </g>
    </>
  ),
  key: (
    <path
      fillRule="evenodd"
      d="M15.5 2a6.5 6.5 0 0 0-6.24 8.34L2 17.6V22h4.4v-2.2h2.2v-2.2h2.2l2.06-2.06A6.5 6.5 0 1 0 15.5 2zm1.9 5.6a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z"
    />
  ),
};

export function CategoryIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const key: CategoryIconName = isCategoryIcon(name) ? name : "bag";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[key]}
    </svg>
  );
}

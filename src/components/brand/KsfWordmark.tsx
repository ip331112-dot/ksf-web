import { Link } from "@/components/i18n/Link";

type Props = {
  /** Extra classes on the outer element. */
  className?: string;
  /** Link target, or null to render the lockup without a link. */
  href?: string | null;
  /**
   * Ink colour.
   *   "white"  — on a dark bar. 21:1 on the header's black. The default.
   *   "accent" — the lifted brand red (--color-mark), matching the
   *              reference lockup. Brighter than the CTA accent on
   *              purpose: the type here is small, light and widely
   *              tracked, so it needs the extra luminance to hold.
   *   "ink"    — for a light surface.
   *
   * The mark and the type are one colour by design: both are stroked or
   * set in the same weight, and splitting them makes the K read as a
   * separate icon rather than the first letter of the name.
   */
  tone?: "white" | "accent" | "ink";
};

/**
 * The header lockup: an oversized drawn K followed by the rest of the name.
 *
 * The reference lockup builds its wordmark the same way — the outsized Z
 * IS the first letter, so the type beside it reads "SECURITY" and the eye
 * assembles "ZSECURITY". Here the K supplies the first letter and the type
 * reads "SF TECH SERVICES". The `aria-label` on the link carries the real
 * name, and the SVG is hidden from assistive tech, so a screen reader hears
 * "KSF Tech Services" rather than a stray "SF".
 *
 * The K is stroked geometry, not a glyph and not an image, so it stays
 * sharp at any size and takes its colour from `currentColor`.
 *
 * The doubled upper arm is the quirk carried over from the reference,
 * whose Z is drawn with two parallel diagonals rather than one. On a K the
 * arm is the only stroke that can take it without the letter turning to
 * mush — doubling the leg as well reads as a printing fault.
 *
 * Everything scales from the parent font-size: the mark is sized in `em`,
 * so the whole lockup grows and shrinks as one.
 */
export function KsfWordmark({ className = "", href = "/", tone = "accent" }: Props) {
  const colour =
    tone === "accent" ? "text-mark" : tone === "ink" ? "text-navy" : "text-white";

  const inner = (
    <span
      className={`inline-flex items-center ${colour} transition-opacity duration-200 hover:opacity-80 ${className}`}
    >
      {/*
        viewBox is tall and narrow so the K reads as a display letter
        rather than a square icon. Butt caps and mitre joins keep the
        terminals cut square, which is what makes the reference feel
        technical rather than friendly.
      */}
      <svg
        viewBox="0 0 50 68"
        className="h-[2.15em] w-auto shrink-0 overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        aria-hidden="true"
        focusable="false"
      >
        {/* stem */}
        <path d="M8 2 V66" />
        {/* upper arm, and the parallel echo that forms the narrow band */}
        <path d="M8 34 L40 2" />
        <path d="M18 34 L50 2" />
        {/* leg */}
        <path d="M8 34 L40 66" />
      </svg>

      {/*
        Below 360px the type is dropped and the K stands alone. The lockup
        is one line by design — letting it wrap puts two lines of small
        caps beside a tall letter, which reads as a mistake — but a single
        line at this tracking is ~140px, and the header already overflowed
        a 320px viewport once with a logo that wide, alongside the language
        switcher, the CTA and the menu toggle.
      */}
      <span
        aria-hidden="true"
        className="ml-[0.34em] hidden font-mark text-[0.98em] leading-none font-light tracking-[0.09em] whitespace-nowrap uppercase min-[360px]:inline min-[420px]:tracking-[0.14em] sm:tracking-[0.2em]"
      >
        SF Tech Services
      </span>
    </span>
  );

  if (!href) {
    return (
      <span role="img" aria-label="KSF Tech Services">
        {inner}
      </span>
    );
  }

  return (
    <Link href={href} aria-label="KSF Tech Services — home" className="inline-flex">
      {inner}
    </Link>
  );
}

import Image from "next/image";
import { Link } from "@/components/i18n/Link";

type Props = {
  /** "dark" for navy backgrounds, "light" for white ones. */
  tone?: "light" | "dark";
  /** Hide the tagline on tight layouts like the sticky header. */
  showTagline?: boolean;
  className?: string;
  href?: string | null;
  /**
   * Classes for the wordmark block, so a caller can drop the text and
   * keep the mark. The sticky header does this below 380px, where the
   * logo, the language switcher, the CTA and the menu toggle together
   * overflow the viewport.
   */
  wordmarkClassName?: string;
};

/**
 * Full KSF lockup: mark + wordmark + optional tagline.
 *
 * The wordmark is set in the site's display face, so the logo and the
 * headlines are visibly one family.
 *
 * The mark is the supplied artwork (`/ksf-logo-mark.png`), not the vector
 * in KsfMark. It is the emblem cropped out of the 1080px square the owner
 * provided — the square also carries its own "KSF TECH SERVICES" and
 * tagline, which would double up against the text set beside it here.
 *
 * The background was made transparent by flood-filling white inward from
 * the edges rather than keying out white globally: the pixel-dissolve
 * squares at the upper right are themselves white, and a global key
 * erases them.
 *
 * alt="" is deliberate — the link already carries the organisation name
 * in text, and announcing both makes a screen reader say it twice.
 */
export function KsfLogo({
  tone = "light",
  showTagline = false,
  className = "",
  href = "/",
  wordmarkClassName = "",
}: Props) {
  const dark = tone === "dark";

  const inner = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/ksf-logo-mark.png"
        alt=""
        width={512}
        height={512}
        priority
        className="h-10 w-10 shrink-0 object-contain"
      />
      <span className={`flex flex-col leading-none ${wordmarkClassName}`}>
        <span
          className={`font-display text-[1.05rem] font-extrabold tracking-tight ${
            dark ? "text-white" : "text-navy"
          }`}
        >
          <span className={dark ? "text-blue-lift" : "text-blue-lift"}>KSF</span> TECH SERVICES
        </span>
        {showTagline && (
          <span
            className={`eyebrow mt-1 text-[0.52rem] ${
              dark ? "text-blue-lift" : "text-ink-faint"
            }`}
          >
            Secure. Innovate. Connect.
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} aria-label="KSF Tech Services — home" className="inline-flex">
      {inner}
    </Link>
  );
}

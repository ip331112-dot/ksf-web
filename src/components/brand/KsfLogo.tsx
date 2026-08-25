import Link from "next/link";
import { KsfMark } from "./KsfMark";

type Props = {
  /** "dark" for navy backgrounds, "light" for white ones. */
  tone?: "light" | "dark";
  /** Hide the tagline on tight layouts like the sticky header. */
  showTagline?: boolean;
  className?: string;
  href?: string | null;
};

/**
 * Full KSF lockup: mark + wordmark + optional tagline.
 *
 * The wordmark is set in Archivo, the same display face the site uses,
 * so the logo and the headlines are visibly one family.
 */
export function KsfLogo({
  tone = "light",
  showTagline = false,
  className = "",
  href = "/",
}: Props) {
  const dark = tone === "dark";

  const inner = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <KsfMark className="h-9 w-9 shrink-0" mono={dark} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[1.05rem] font-extrabold tracking-tight ${
            dark ? "text-white" : "text-navy"
          }`}
        >
          <span className={dark ? "text-blue-lift" : "text-blue"}>KSF</span> TECH SERVICES
        </span>
        {showTagline && (
          <span
            className={`eyebrow mt-1 text-[0.52rem] ${
              dark ? "text-blue-lift/80" : "text-ink-faint"
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

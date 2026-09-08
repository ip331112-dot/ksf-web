import Image from "next/image";

/**
 * The hero's 16:9 visual panel.
 *
 * It replaces a bare floating logo with something that reads as course
 * artwork: a framed, glowing panel that sits beside the headline the way
 * a promo still would.
 *
 * Deliberately TEXT-FREE. The hero is bilingual, and any words baked into
 * this panel would be right in one locale and wrong in the other — the
 * same trap that leaves `applications` unable to send a French decision
 * email. Everything here is geometry plus the real logo mark.
 *
 * Built as markup rather than a flat exported image so it stays crisp at
 * any width, re-uses `/ksf-logo-mark.png` instead of duplicating the
 * brand into a second asset, and costs one already-cached PNG.
 */
export function CoursePanel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden border border-line ${className}`}
      style={{ borderRadius: 12 }}
    >
      {/* Ground: the theme wash, tuned warmer than the page so the panel
          separates from the hero band behind it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 72% 30%, rgba(255,31,45,0.30), transparent 55%)," +
            "radial-gradient(circle at 22% 82%, rgba(239,68,68,0.18), transparent 50%)," +
            "linear-gradient(135deg, #000000 0%, #10000a 45%, #300005 100%)",
        }}
      />

      {/* Geometry: a measurement grid, the orbit arcs the KSF mark is
          built from, and a scatter of pixel squares echoing the logo's
          dissolve motif. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <pattern id="ksf-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="rgba(239,68,68,0.10)" strokeWidth="1" />
          </pattern>
          <linearGradient id="ksf-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,31,45,0.55)" />
            <stop offset="100%" stopColor="rgba(239,68,68,0)" />
          </linearGradient>
        </defs>

        <rect width="640" height="360" fill="url(#ksf-grid)" />

        <g fill="none" stroke="url(#ksf-arc)">
          <circle cx="320" cy="180" r="132" strokeWidth="1.5" />
          <circle cx="320" cy="180" r="164" strokeWidth="1" strokeDasharray="10 14" />
          <circle cx="320" cy="180" r="196" strokeWidth="1" strokeDasharray="2 18" />
        </g>

        {/* Circuit traces running out to the edges. */}
        <g stroke="rgba(239,68,68,0.28)" strokeWidth="1.25" fill="none">
          <path d="M0 92h96l24-24h84" />
          <path d="M640 268h-96l-24 24h-84" />
          <path d="M0 300h60l28 28h72" />
          <path d="M640 60h-60l-28-28h-72" />
        </g>
        <g fill="rgba(255,31,45,0.75)">
          <rect x="200" y="64" width="5" height="5" />
          <rect x="214" y="52" width="7" height="7" />
          <rect x="232" y="40" width="4" height="4" />
          <rect x="432" y="292" width="5" height="5" />
          <rect x="418" y="304" width="7" height="7" />
          <rect x="404" y="318" width="4" height="4" />
        </g>
      </svg>

      {/*
        The artwork, cut from the owner's own flyer by
        `scripts/crop-flyer-art.ps1` — the shield, icon column, server
        racks and laptop, with the flyer's headline, service blocks and
        contact strip left behind. Those are set in type sized for print;
        at the ~432px this panel renders they are illegible specks.

        object-contain, not cover: the crop is 4:3-ish (1.24) and the
        frame is 16:9, so covering would slice the top off the shield and
        the foot off the laptop. Contained, the whole illustration reads
        and the panel's own gradient fills the margins.
      */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/ksf-hero-art.png"
          alt=""
          width={312}
          height={259}
          priority
          className="h-full w-auto max-w-full object-contain"
          /*
            The flyer artwork is cyan-blue; the site is red on black. The
            hue rotation swings blue (~210 degrees) round to red, and the
            extra saturation puts it in the same register as --color-blue
            (#ef4444) rather than leaving it a washed-out maroon.

            It is a filter and not a re-export on purpose: the PNG on disk
            stays the owner's original artwork, so this is one line to
            tune or delete. 150deg and 1.4 were picked by rendering the
            candidates side by side, not by arithmetic — the CSS
            hue-rotate matrix is an approximation and lands warmer than
            a true HSL rotation would.

            drop-shadow lives in here rather than in a Tailwind class
            because `filter` is a single property: an inline value would
            silently replace the utility's drop-shadow, not add to it.
          */
          style={{
            filter:
              "hue-rotate(150deg) saturate(1.4) drop-shadow(0 0 40px rgba(255,31,45,0.35))",
          }}
        />
      </div>

      {/* Inner edge, so the panel reads as glass over the wash rather
          than a hole cut in it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: 12,
          boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.18), inset 0 0 60px rgba(0,0,0,0.55)",
        }}
      />
    </div>
  );
}

import { ImageResponse } from "next/og";
import { SITE } from "@/content/site";
import { loadDictionaryFor } from "@/lib/i18n/dictionary";
import { PRICE_GBP } from "@/content/tracks";
import { fill, LOCALES } from "@/lib/locale";

/**
 * The card people see when the site is shared.
 *
 * Until now there was none, so every link posted to Facebook, WhatsApp
 * or LinkedIn rendered as a bare grey rectangle. That affects every
 * share of the site, including KSF's own posts, which makes it the part
 * of "adding social media" with the widest reach.
 *
 * Generated rather than uploaded: the brand mark is already true vector
 * in KsfMark, so there is no image file to find, and the strapline can
 * be written in the language of the page being shared.
 *
 * No custom font is loaded on purpose. Fetching Archivo from Google at
 * build time would make the build depend on a network call, and reading
 * the hashed copy next/font leaves in .next would break the moment the
 * hash changes. @vercel/og falls back to Geist, which is a clean
 * geometric sans and sits fine beside the mark.
 */

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Both cards are known at build time, so render them then rather than on
 * demand. A crawler that has to wait for an image to be composed will
 * often just skip it, and the share then falls back to no picture —
 * which is the failure this whole file exists to fix.
 */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await loadDictionaryFor(lang);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // --color-ground, the site's own page colour.
          background: "linear-gradient(135deg, #0d0f12 0%, #16191e 100%)",
          padding: "72px 80px",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 120 120" fill="none">
            <path
              d="M 107.8 55.8 A 48 48 0 1 1 72.4 13.6"
              stroke="#E7EAEF"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d="M 105.1 43.6 A 48 48 0 0 1 36 101.6"
              stroke="#E01E37"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <g fill="#E01E37">
              <rect x="83" y="7" width="6.5" height="6.5" />
              <rect x="94.5" y="14.5" width="5" height="5" />
              <rect x="92.5" y="1.5" width="4" height="4" />
              <rect x="104" y="9" width="3.5" height="3.5" />
              <rect x="101.5" y="22" width="3" height="3" />
            </g>
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 38,
                fontWeight: 700,
                color: "#f5f7fa",
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
              }}
            >
              KSF TECH SERVICES
            </div>
            <div
              style={{
                fontSize: 17,
                color: "#ff6b7d",
                letterSpacing: "0.18em",
                marginTop: 6,
              }}
            >
              {SITE.tagline.toUpperCase()}
            </div>
          </div>
        </div>

        {/* The promise, in the language of the page being shared */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#f5f7fa",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            {t.home.strapline}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#8b95a5",
              marginTop: 22,
              maxWidth: 880,
              lineHeight: 1.4,
            }}
          >
            {fill(t.home.intro, { price: PRICE_GBP })}
          </div>
        </div>

        {/* Accent rule, so the card reads as designed rather than plain */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 88, height: 5, background: "#e01e37" }} />
          <div style={{ fontSize: 24, color: "#8b95a5" }}>
            {SITE.url.replace("https://", "")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

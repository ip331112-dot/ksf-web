import type { Metadata } from "next";
import { Inter, Orbitron, Jura, IBM_Plex_Mono } from "next/font/google";
import { SITE } from "@/content/site";
import { LOCALES, LOCALE_TAGS, fill } from "@/lib/locale";
import { getDictionary, getLocale } from "./dictionaries";
import { organizationSchema } from "@/lib/seo/organization";
import { PRICE_GBP } from "@/content/tracks";
import "../globals.css";

/**
 * Inter carries both display and body. One face at two ends of its weight
 * range is the modern SaaS convention the reference site is built on, and
 * it is what lets a 900-weight headline sit above 400-weight copy without
 * the seam a second family would show.
 *
 * No `weight` array: Inter ships from Google as a variable font, so
 * omitting it loads the whole 100-900 axis in a single file. Listing
 * weights would download one static file each and cap what the headings
 * can reach.
 *
 * IBM Plex Mono stays. It is not decorative here — it sets exam codes,
 * prices and the KSF-YYYY-NNNN application references, where fixed-width
 * digits are the point.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Orbitron is the futuristic display face, and it is used SPARINGLY: the
 * hero headline and the headline figures, nothing else. It is a display
 * font with squared-off geometric counters — legible at 44px and above,
 * genuinely tiring below about 24px — so body copy, section headings and
 * UI labels all stay on Inter.
 *
 * Variable font, 400-900, so no `weight` array.
 *
 * `latin` is the ONLY subset Orbitron publishes — next/font's types
 * reject "latin-ext" outright. That matters here because the French hero
 * reads "Apprenez la cybersécurité depuis zéro…" and the price is "£10":
 * é and £ both sit in U+00A0-00FF, inside the latin range, and both were
 * checked against the rendered font rather than assumed. See the note on
 * `hero-title` in globals.css.
 */
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Jura carries the header wordmark and nothing else.
 *
 * It was chosen by rendering "SECURITY" from the reference lockup beside
 * seven candidates at matched size: Michroma and Syncopate are far too
 * heavy, Iceland and Rajdhani too condensed for a wide-tracked mark, and
 * Saira too neutral to read as technical. Jura is the only one of them
 * that is genuinely thin (300), geometric and open.
 *
 * Variable font, so the whole 300-700 axis arrives in one file; the mark
 * only ever uses 300.
 */
const jura = Jura({
  variable: "--font-jura",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/**
 * Both locales are known up front, so both get prerendered rather than
 * built on first request.
 */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  const description = fill(t.meta.siteDescription, { price: PRICE_GBP });

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: t.meta.siteTitle,
      template: `%s · ${SITE.name}`,
    },
    description,
    /*
     * No `alternates` here, on purpose.
     *
     * Metadata set in a layout is inherited by every page beneath it, so
     * a canonical of "/en" makes all forty pages declare themselves
     * duplicates of the homepage — an instruction to search engines to
     * drop them. A layout cannot know the path, so each page states its
     * own through alternatesFor() in @/lib/i18n/alternates.
     */
    openGraph: {
      title: SITE.name,
      description,
      url: `${SITE.url}/${locale}`,
      siteName: SITE.name,
      locale: LOCALE_TAGS[locale].replace("-", "_"),
      type: "website",
    },
    /*
     * Without this the card falls back to a small square thumbnail. The
     * opengraph-image is 1200x630, so it is worth asking for the large
     * format that shape was made for. No `site` handle: KSF has no
     * Twitter/X account, and naming one that does not exist is worse
     * than omitting the field.
     */
    twitter: {
      card: "summary_large_image",
      title: SITE.name,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = await getDictionary();

  /*
   * The font variables must sit on <html>, not <body>. Tailwind emits
   * --font-sans / --font-display onto `:root`, and each is defined as
   * var(--font-roboto) etc. A custom property that references another one
   * that is not defined at that level is invalid at computed-value time —
   * so with the classes on <body>, `:root` resolved --font-sans to
   * nothing, that emptiness inherited down, and every font-family fell
   * through to the Tailwind default stack.
   *
   * This was silently true of Archivo and IBM Plex Sans before the switch
   * to Roboto: the faces downloaded on every page load and were never
   * once painted.
   */
  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`${inter.variable} ${orbitron.variable} ${jura.variable} ${plexMono.variable}`}
    >
      <body className="antialiased">
        {/*
          Organization schema, site-wide. It is what ties ksftechservices.com
          to the Facebook, YouTube and TikTok accounts as far as a search
          engine is concerned — the footer icons only do that for humans.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema(locale)),
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-blue focus:px-4 focus:py-2 focus:text-white"
        >
          {t.nav.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}

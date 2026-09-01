import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { SITE } from "@/content/site";
import { LOCALES, LOCALE_TAGS, fill } from "@/lib/locale";
import { getDictionary, getLocale } from "./dictionaries";
import { organizationSchema } from "@/lib/seo/organization";
import { PRICE_GBP } from "@/content/tracks";
import "../globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "800"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

  return (
    <html lang={LOCALE_TAGS[locale]}>
      <body
        className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
      >
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

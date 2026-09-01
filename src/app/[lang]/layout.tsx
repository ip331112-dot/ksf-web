import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { SITE } from "@/content/site";
import { LOCALES, LOCALE_TAGS } from "@/lib/locale";
import { getDictionary, getLocale } from "./dictionaries";
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

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: `${SITE.name} — Certification training and cyber security`,
      template: `%s · ${SITE.name}`,
    },
    description: SITE.description,
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
      description: SITE.description,
      url: `${SITE.url}/${locale}`,
      siteName: SITE.name,
      locale: LOCALE_TAGS[locale].replace("-", "_"),
      type: "website",
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

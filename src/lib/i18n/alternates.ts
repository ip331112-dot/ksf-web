import type { Metadata } from "next";
import { SITE } from "@/content/site";
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS } from "@/lib/locale";
import { getLocale } from "@/app/[lang]/dictionaries";

/**
 * Canonical and hreflang links for one page.
 *
 * These CANNOT live in the root layout. Metadata set there is inherited
 * by every page beneath it, so a canonical of "/en" makes all forty
 * pages declare themselves duplicates of the homepage — which is an
 * instruction to search engines to drop them from the index. The layout
 * has no way to know the path, so each page states its own.
 *
 * `path` is the route without the locale segment: "" for the homepage,
 * "/tracks/cisco-ccna" for a track.
 */
export async function alternatesFor(path: string): Promise<Metadata["alternates"]> {
  const locale = await getLocale();

  return {
    canonical: `${SITE.url}/${locale}${path}`,
    languages: {
      ...Object.fromEntries(
        LOCALES.map((l) => [LOCALE_TAGS[l], `${SITE.url}/${l}${path}`]),
      ),
      // x-default points at the language served when we have nothing to
      // go on, not at the bare root — the root only redirects, and a
      // redirect is a poor thing to hand a crawler as an endpoint.
      "x-default": `${SITE.url}/${DEFAULT_LOCALE}${path}`,
    },
  };
}

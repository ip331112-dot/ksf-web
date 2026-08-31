/**
 * Locale constants, safe to import from anywhere.
 *
 * Deliberately free of `next/root-params`, `next/navigation` and any
 * dictionary import: Client Components, the proxy and Server Components
 * all need these values, and root-params cannot cross into the client.
 * Everything that needs the *current* locale gets it from
 * app/[lang]/dictionaries.ts (server) or useLocale() (client).
 */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language named in its own tongue, as a switcher should. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

/** BCP-47 tags for <html lang> and Open Graph. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  fr: "fr-FR",
};

/** Cookie holding a remembered choice. Read by the proxy, written by the switcher. */
export const LOCALE_COOKIE = "ksf-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const isLocale = (value: string | undefined | null): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/**
 * Prefix an app-relative path with a locale.
 *
 * Leaves anything that is not an internal absolute path alone — external
 * URLs, mailto:, tel: and #anchors all pass through untouched, which is
 * what lets the Link wrapper be used indiscriminately.
 */
export function localised(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  // Already carries a locale: leave it, or the switcher's own output
  // would end up as /fr/fr/tracks.
  const first = href.split("/")[1];
  if (isLocale(first)) return href;

  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** The locale a pathname is under, or the default if it carries none. */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/**
 * Fill {placeholders} in a dictionary string.
 *
 * The dictionaries carry `{price}` and `{email}` rather than being split
 * into fragments and concatenated, because word order differs between
 * languages and a sentence assembled from pieces can only ever come out
 * in English order.
 *
 * An unmatched placeholder is left visible rather than blanked: a page
 * reading "£{price} a month" is obviously broken and gets fixed, where a
 * silently empty one ships.
 */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

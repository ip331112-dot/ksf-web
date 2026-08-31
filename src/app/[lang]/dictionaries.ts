import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/locale";
import { loadDictionary, type Dictionary } from "@/lib/i18n/dictionary";

/**
 * The root-params layer over @/lib/i18n/dictionary, for Server
 * Components.
 *
 * From the Next.js docs: `next/root-params` works in Server Components
 * and server-side utilities, but NOT in Client Components, Server
 * Actions or Route Handlers. Anything on the far side of one of those
 * boundaries imports the plain loader instead and passes the locale
 * explicitly — which is why this file holds nothing but the lookup.
 */
export type { Dictionary, Locale };

/** The current locale. Server Components only. */
export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  // An unknown locale 404s rather than quietly falling back: /de/tracks
  // serving English would leave a visitor with no idea they were reading
  // a language they had not asked for.
  if (!isLocale(locale)) notFound();
  return locale;
}

/** The dictionary for the current request. Server Components only. */
export async function getDictionary(): Promise<Dictionary> {
  return loadDictionary(await getLocale());
}

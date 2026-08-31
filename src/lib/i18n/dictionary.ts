import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/locale";

/**
 * Dictionary loading, with no dependency on `next/root-params`.
 *
 * That separation is the whole point of this module. Server Actions may
 * not call root-params at all, but they still need translated validation
 * messages, so they take the locale from the submitted form and load a
 * dictionary through here. The root-params convenience wrapper for
 * Server Components lives in app/[lang]/dictionaries.ts on top of this.
 *
 * Imports are dynamic so only the language in play is loaded, and because
 * this only ever runs on the server, no translation file is shipped to
 * the browser — only the rendered strings are.
 */
const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  fr: () => import("./dictionaries/fr.json").then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export function loadDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

/**
 * Load a dictionary for a locale that arrived from outside — a form
 * field, an email job, a stored record.
 *
 * Falls back to the default rather than throwing: an action handed a
 * junk locale should still be able to tell the person what went wrong,
 * in some language, rather than failing on the way to the error message.
 */
export function loadDictionaryFor(
  locale: string | undefined | null,
): Promise<Dictionary> {
  return loadDictionary(isLocale(locale) ? locale : DEFAULT_LOCALE);
}

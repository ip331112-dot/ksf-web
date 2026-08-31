"use client";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/lib/locale";

/**
 * Record an explicit language choice.
 *
 * A plain cookie rather than a server action: the proxy needs to read it
 * on the very next request, and nothing about a language preference
 * warrants a round trip.
 *
 * It lives in its own module because the React Compiler refuses direct
 * writes to browser globals inside a component body, and this is a real
 * side effect belonging to the click rather than to rendering.
 */
export function rememberLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};samesite=lax`;
}

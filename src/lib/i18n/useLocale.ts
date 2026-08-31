"use client";

import { usePathname } from "next/navigation";
import { localeFromPath, localised, type Locale } from "@/lib/locale";

/**
 * The current locale inside a Client Component.
 *
 * Client Components cannot call `next/root-params`, and threading the
 * locale down as a prop through the apply flow and the admin shell would
 * be a lot of plumbing for a value the URL already carries.
 */
export function useLocale(): Locale {
  return localeFromPath(usePathname());
}

/** A localiser bound to the current locale, for router.push targets. */
export function useLocalisedPath(): (href: string) => string {
  const locale = useLocale();
  return (href: string) => localised(href, locale);
}

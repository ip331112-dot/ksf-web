"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { localeFromPath, localised } from "@/lib/locale";

/**
 * next/link with the current locale prefixed automatically.
 *
 * Every internal link in the site goes through this. The alternative —
 * writing `/${locale}/tracks` at each of the sixty-odd call sites — is
 * the kind of change that works everywhere it was applied and breaks
 * silently everywhere it was missed.
 *
 * The locale comes from the pathname rather than root-params because
 * this must work inside Client Components too (the header, the apply
 * flow), and root-params cannot cross that boundary.
 *
 * External URLs, mailto:, tel: and #anchors pass straight through, so
 * this is safe to use for every link on the page without thinking about
 * which kind it is.
 */
export function Link({
  href,
  ...props
}: ComponentProps<typeof NextLink> & { href: string }) {
  const locale = localeFromPath(usePathname());
  return <NextLink href={localised(href, locale)} {...props} />;
}

import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";
import { LOCALES } from "@/lib/locale";

/**
 * The apply flow and the applicant status page must never be indexed:
 * status URLs carry a one-time token, and an indexed token would expose
 * one applicant's decision to anyone who found it in search results.
 *
 * Every private path is listed twice — once unprefixed, once per locale.
 * Locale routing moved these pages to /en/status/… and /fr/status/…, and
 * a rule reading `/status/` silently stops matching them. Wildcards would
 * be shorter but are an extension rather than part of the original robots
 * specification, so the explicit list is what actually protects the
 * tokens; the wildcard is only there for locales added later.
 */
export default function robots(): MetadataRoute.Robots {
  const priv = ["/status/", "/admin/", "/api/", "/apply/success"];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...priv,
        ...LOCALES.flatMap((l) => priv.map((p) => `/${l}${p}`)),
        ...priv.map((p) => `/*${p}`),
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}

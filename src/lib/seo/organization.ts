import { SITE } from "@/content/site";
import { SOCIAL } from "@/content/social";
import { LOCALE_TAGS, type Locale } from "@/lib/locale";

/**
 * Organization schema, with `sameAs` naming the social profiles.
 *
 * This is the mechanism search engines use to decide that a website and
 * a set of social accounts belong to the same organisation. Without it
 * they are unconnected pages that happen to share a name, and nothing
 * links the Facebook page to ksftechservices.com.
 *
 * Worth more than the footer icons and invisible on the page, which is
 * why it is worth doing even while only three profiles exist.
 *
 * Deliberately NOT LocalBusiness: that schema wants a street address and
 * opening hours, and KSF's trading address is still a placeholder. A
 * schema filled with invented facts is worse than a smaller true one.
 */
export function organizationSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: `${SITE.url}/${locale}`,
    email: SITE.email,
    description: SITE.description,
    telephone: [SITE.phoneUk, SITE.phoneFr],
    areaServed: SITE.coverage,
    inLanguage: Object.values(LOCALE_TAGS),
    sameAs: SOCIAL.map((s) => s.url),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE.email,
      telephone: SITE.phoneUk,
      availableLanguage: ["English", "French"],
    },
  };
}

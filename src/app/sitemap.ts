import type { MetadataRoute } from "next";
import { SITE, SERVICES } from "@/content/site";
import { TRACKS } from "@/content/tracks";
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS } from "@/lib/locale";

/**
 * Track pages carry the highest priority: they are the pages people search
 * for by exam code, and the ones that convert. Legal shells are excluded
 * until they hold real wording — submitting placeholder pages to search
 * engines wastes crawl budget and looks unfinished.
 *
 * Each page is listed once per locale, and every entry declares the other
 * locale as an alternate. Without those alternates the two languages
 * compete as duplicates of each other rather than being understood as one
 * page a visitor can read either way.
 */
type Entry = {
  path: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
};

const PAGES: Entry[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/tracks", changeFrequency: "weekly", priority: 0.9 },
  ...TRACKS.filter((t) => t.open).map((t) => ({
    path: `/tracks/${t.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  })),
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.7 },
  ...SERVICES.map((s) => ({
    path: `/services/${s.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  })),
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PAGES.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${SITE.url}/${locale}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          ...Object.fromEntries(
            LOCALES.map((l) => [
              LOCALE_TAGS[l],
              `${SITE.url}/${l}${page.path}`,
            ]),
          ),
          "x-default": `${SITE.url}/${DEFAULT_LOCALE}${page.path}`,
        },
      },
    })),
  );
}

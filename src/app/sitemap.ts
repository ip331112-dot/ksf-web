import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";
import { SERVICES } from "@/content/site";
import { TRACKS } from "@/content/tracks";

/**
 * Track pages carry the highest priority: they are the pages people search
 * for by exam code, and the ones that convert. Legal shells are excluded
 * until they hold real wording — submitting placeholder pages to search
 * engines wastes crawl budget and looks unfinished.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tracks`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...TRACKS.filter((t) => t.open).map((t) => ({
      url: `${base}/tracks/${t.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...SERVICES.map((s) => ({
      url: `${base}/services/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}

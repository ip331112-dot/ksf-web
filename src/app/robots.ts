import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

/**
 * The apply flow and the applicant status page must never be indexed:
 * status URLs carry a one-time token, and an indexed token would expose
 * one applicant's decision to anyone who found it in search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/status/", "/admin/", "/api/", "/apply/success"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}

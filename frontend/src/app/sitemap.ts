import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

/**
 * Only pages that are real, public, and worth indexing.
 *
 * `/browse` and `/listings/[slug]` are deliberately absent. They were listed
 * here while the catalog was public; behind a login wall a crawler following
 * either URL is redirected, so listing them would teach search engines to index
 * the login page under a listing's name. `robots.ts` disallows both for the
 * same reason.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE.url, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE.url}/signup`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE.url}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE.url}/forgot-password`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}

import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

/** Only pages that are real, public, and worth indexing. */
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

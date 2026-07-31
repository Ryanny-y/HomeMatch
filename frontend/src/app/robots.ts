import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Token-bearing and signed-in routes. These are already noindex at the
      // page level; disallowing them keeps crawlers from spending a one-time
      // verification or reset token just by following a link.
      disallow: [
        "/reset-password",
        "/verify-email",
        "/dashboard",
        "/onboarding",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}

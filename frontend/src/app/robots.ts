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
      //
      // The catalog is here because it needs an account: a crawler reaching
      // /browse or a listing is redirected to /login, and what it would index
      // under that URL is the login form.
      disallow: [
        "/reset-password",
        "/verify-email",
        "/dashboard",
        "/onboarding",
        "/browse",
        "/listings/",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}

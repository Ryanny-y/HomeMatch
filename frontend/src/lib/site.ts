import type { Role } from "@homematch/shared";

/**
 * Single source of truth for anything that appears in more than one place:
 * the wordmark, the nav, the canonical URL used by metadata and JSON-LD.
 *
 * Nav items are typed so the header cannot accidentally ship a link to a route
 * that does not exist yet — see the `no dead links` rule in the landing brief.
 * Every entry is either an on-page anchor or a route that is actually built.
 */

export const SITE = {
  name: "HomeMatch AI",
  tagline: "Helping people find the right home, not just another listing.",
  description:
    "HomeMatch AI scores every Quezon City apartment against your budget, commute, and lifestyle, then shows the true monthly cost — not just the rent.",
  locale: "en_PH",
  city: "Quezon City, Philippines",
  /**
   * Absolute origin. Metadata needs this to emit canonical and og:url tags, so
   * it must never be a relative path. Falls back to localhost for local dev.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contactEmail: "hello@homematch.ph",
} as const;

export type NavLink = {
  label: string;
  href: string;
};

/** Header anchors. All resolve to a section on the landing page. */
export const PRIMARY_NAV: readonly NavLink[] = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#match-score" },
  { label: "For landlords", href: "/#for-landlords" },
  { label: "FAQ", href: "/#faq" },
];

export const SIGNUP_RENTER = "/signup?role=renter";
export const SIGNUP_LANDLORD = "/signup?role=landlord";

/**
 * Where each role belongs after signing in.
 *
 * One definition because three places need the same answer: the login form
 * routes with it, `/dashboard` redirects with it, and the header links to it.
 * Two copies would drift the moment a fourth role or a real admin area lands.
 *
 * Admin goes to /landlord because managing listings is what an admin does
 * today — `/admin` is in the roadmap and does not exist yet.
 */
export function homeFor(role: Role): string {
  return role === "landlord" || role === "admin" ? "/landlord" : "/dashboard";
}

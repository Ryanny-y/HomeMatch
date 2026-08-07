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

/**
 * The header's main nav — one route and four landing-page anchors.
 *
 * `/browse` leads first because it is the only entry to the catalog, and it is
 * shown to signed-out visitors deliberately even though the page requires an
 * account: they land on `/login?next=/browse` and arrive at the catalog once
 * they sign in. That is the funnel, not a dead link.
 */
export const PRIMARY_NAV: readonly NavLink[] = [
  { label: "Browse", href: "/browse" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#match-score" },
  { label: "For landlords", href: "/#for-landlords" },
  { label: "FAQ", href: "/#faq" },
];

export const SIGNUP_RENTER = "/signup?role=renter";
export const SIGNUP_LANDLORD = "/signup?role=landlord";

/**
 * Where each role's own area lives — the page the header links to, and where a
 * "you don't belong here" bounce sends someone.
 *
 * An admin goes to /admin, which is the only place that sees every account and
 * every owner's listings. They can still reach /landlord — that is where the
 * listing editor lives, and it accepts an admin — but it is not their home.
 *
 * **This used to answer a second question as well, and must not again.** It
 * briefly returned `/onboarding` for a renter so that login would hit the
 * first-run gate. That is a different question — *where does a session start* —
 * and collapsing the two made the header's "Your profile" link point at the
 * gate, which forwards an onboarded renter to /browse. Since this was the only
 * link to /profile in the app, the page became unreachable.
 *
 * Session entry is `entryFor`. **Bounces use this; entry uses that.**
 */
export function homeFor(role: Role): string {
  if (role === "admin") return "/admin";

  return role === "landlord" ? "/landlord" : "/profile";
}

/**
 * Where a session begins, which is not always where the role lives.
 *
 * A renter starts at /onboarding: a gate rather than a destination, showing the
 * first-run questions if they have never been answered and forwarding to
 * /browse otherwise. The indirection is the point — one entry that decides,
 * rather than every caller having to know whether this renter is new.
 *
 * Everyone else starts where they live, so this defers rather than restating
 * those routes.
 */
export function entryFor(role: Role): string {
  return role === "renter" ? "/onboarding" : homeFor(role);
}

/**
 * Where to send someone after they sign in, given a `?next=` we do not trust.
 *
 * **This is an open-redirect guard, not tidying.** `next` arrives in a URL that
 * anyone can compose and send to anyone — the classic attack is a link to our
 * own login page carrying `?next=https://homematch-ph.example`, which lands a
 * user who has just typed their password on someone else's site, still
 * believing they are here. So the value is not sanitised into shape; anything
 * that is not plainly a path on this site is discarded for the role's entry
 * point.
 *
 * Rejected, and why each matters:
 *
 * - `https://evil.ph` — absolute, the obvious case.
 * - `//evil.ph` — protocol-relative. Browsers treat it as absolute, so a bare
 *   `startsWith("/")` check passes it straight through. This is the one that
 *   catches people out.
 * - `/\evil.ph` — backslash variant, which several browsers normalise to `//`.
 * - `javascript:…`, `data:…` — caught by the same rule, since a URL carrying a
 *   scheme cannot begin with `/`.
 */
export function safeNext(next: string | undefined, role: Role): string {
  if (!next) return entryFor(role);

  const isRelativePath =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");

  return isRelativePath ? next : entryFor(role);
}

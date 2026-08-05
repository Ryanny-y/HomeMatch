import type { ListingStatus, Role } from "@homematch/shared";

/**
 * Static copy and option lists for `/admin`.
 *
 * The voice is the product's — plain, specific, and unafraid to name the
 * downside of a destructive action rather than softening it.
 */

export const ADMIN_NAV = [
  {
    href: "/admin",
    label: "Overview",
    description: "What is actually in the database right now.",
  },
  {
    href: "/admin/users",
    label: "Users",
    description: "Every account, and what you can do about one.",
  },
  {
    href: "/admin/listings",
    label: "Listings",
    description: "Every listing, across every owner.",
  },
] as const;

export type AdminNavItem = (typeof ADMIN_NAV)[number];

/** `/admin` is a prefix of every other route, so it must match exactly. */
export function navItemFor(pathname: string): AdminNavItem {
  const match = ADMIN_NAV.find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
  );

  return match ?? ADMIN_NAV[0];
}

export const ROLE_LABEL: Record<Role, string> = {
  renter: "Renter",
  landlord: "Landlord",
  admin: "Admin",
};

export const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  published: "Live",
  archived: "Archived",
};

export const ROLE_OPTIONS = [
  { value: "", label: "Any role" },
  { value: "renter", label: "Renters" },
  { value: "landlord", label: "Landlords" },
  { value: "admin", label: "Admins" },
] as const;

export const VERIFIED_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "true", label: "Verified" },
  { value: "false", label: "Unverified" },
] as const;

export const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Live" },
  { value: "archived", label: "Archived" },
] as const;

export const PROPERTY_TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  { value: "condo", label: "Condo" },
  { value: "apartment", label: "Apartment" },
  { value: "boarding_house", label: "Boarding house" },
] as const;

/**
 * Why the overview shows what it shows.
 *
 * Rendered on the page, not just written here: a dashboard with no traffic
 * numbers invites the question, and answering it in the interface is more
 * honest than leaving a reader to assume the data is missing by accident.
 */
export const OVERVIEW_NOTE =
  "Every figure here is a count of rows in the database. Views, saves and enquiries aren't tracked yet, so they aren't shown — a number you can't check is worse than no number.";

export const EMPTY_USERS = {
  title: "No accounts match that",
  body: "Try a different role, verification state, or search term.",
};

export const EMPTY_LISTINGS = {
  title: "No listings match that",
  body: "Try a different status, owner, or search term.",
};

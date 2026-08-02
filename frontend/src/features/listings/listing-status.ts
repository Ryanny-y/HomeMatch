import type { Listing } from "@/features/listings/api/listings.api";

/**
 * What the dashboard sorts, filters, and acts on.
 *
 * The stored `status` alone cannot drive the screen: a draft with every field
 * filled and a draft missing four of them are the same row to the database and
 * completely different jobs to a landlord. Folding `gaps` into the status here
 * means the badge, the filter chips, the sort order, and the next-action card
 * read one function and cannot disagree with each other.
 */
export type UnitStatus = "ready" | "needs_work" | "live" | "archived";

export function statusOf(listing: Listing): UnitStatus {
  if (listing.status === "archived") return "archived";
  if (listing.status === "published") return "live";
  return listing.gaps.length > 0 ? "needs_work" : "ready";
}

/**
 * A published listing can lose a field after it goes live — delete its last
 * photo and renters are looking at an incomplete unit right now. It stays
 * `live`, because it genuinely is, but it still owes work.
 */
export function needsAttention(listing: Listing): boolean {
  return listing.status !== "archived" && listing.gaps.length > 0;
}

export const STATUS_LABEL: Record<UnitStatus, string> = {
  ready: "Ready to publish",
  needs_work: "Needs work",
  live: "Live",
  archived: "Archived",
};

/**
 * Ordered by what it costs to make the unit earn, cheapest first.
 *
 * `ready` leads because publishing is one click for a unit that is already
 * finished, and within `needs_work` the listing with the fewest gaps comes
 * first — the closest to done rather than the biggest pile. The next-action
 * card is then simply the first row, which is why it can never point somewhere
 * the list does not.
 */
const RANK: Record<UnitStatus, number> = {
  ready: 0,
  needs_work: 1,
  live: 2,
  archived: 3,
};

export function byUrgency(a: Listing, b: Listing): number {
  const rank = RANK[statusOf(a)] - RANK[statusOf(b)];
  if (rank !== 0) return rank;

  // Within `live`, the ones that have lost a field outrank the clean ones.
  const owing = Number(needsAttention(b)) - Number(needsAttention(a));
  if (owing !== 0) return owing;

  const gaps = a.gaps.length - b.gaps.length;
  if (gaps !== 0) return gaps;

  return a.title.localeCompare(b.title);
}

export type NextAction =
  | { kind: "publish"; listing: Listing }
  | { kind: "fix"; listing: Listing }
  | { kind: "clear" };

/** Expects `listings` already sorted by `byUrgency`. */
export function selectNextAction(listings: readonly Listing[]): NextAction {
  const ready = listings.find((listing) => statusOf(listing) === "ready");
  if (ready) return { kind: "publish", listing: ready };

  const owing = listings.find(needsAttention);
  if (owing) return { kind: "fix", listing: owing };

  return { kind: "clear" };
}

export type StatusFilter = UnitStatus | "all";

export function matchesFilter(listing: Listing, filter: StatusFilter): boolean {
  if (filter === "all") return listing.status !== "archived";
  if (filter === "needs_work") return needsAttention(listing);
  return statusOf(listing) === filter;
}

export function isStatusFilter(value: string | undefined): value is StatusFilter {
  return (
    value === "all" ||
    value === "ready" ||
    value === "needs_work" ||
    value === "live" ||
    value === "archived"
  );
}

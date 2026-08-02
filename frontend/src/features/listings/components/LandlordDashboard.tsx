"use client";

import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { useMyListings } from "@/features/listings/hooks/useListings";
import {
  byUrgency,
  matchesFilter,
  needsAttention,
  selectNextAction,
  statusOf,
} from "@/features/listings/listing-status";
import type { StatusFilter as Filter } from "@/features/listings/listing-status";
import type { Listing } from "@/features/listings/api/listings.api";
import { FilterEmptyState, ListingsEmptyState } from "./ListingsEmptyState";
import { ListingRow } from "./ListingRow";
import { NextAction } from "./NextAction";
import { StatusFilter } from "./StatusFilter";

/**
 * Counts, said once.
 *
 * This replaced three stat tiles, one of which summed true monthly cost across
 * every published unit — a figure no renter pays and no landlord earns. It
 * existed because a stat row wants three tiles. Per-unit true monthly is on
 * every row, where it means something.
 */
function summaryLine(listings: readonly Listing[]): string {
  const owned = listings.filter((l) => l.status !== "archived");
  const live = owned.filter((l) => statusOf(l) === "live").length;
  const owing = owned.filter(needsAttention).length;

  const parts = [`${owned.length} ${owned.length === 1 ? "unit" : "units"}`];
  if (live > 0) parts.push(`${live} live`);
  if (owing > 0) parts.push(`${owing} waiting on you`);

  return parts.join(" · ");
}

const NOTHING_MATCHED: Record<Exclude<Filter, "all">, string> = {
  needs_work: "Nothing is waiting on you.",
  ready: "Nothing is finished and waiting to be published.",
  live: "None of your units are visible to renters yet.",
  archived: "You haven't archived anything.",
};

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="h-24 rounded-card bg-surface-sunken" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-32 rounded-card bg-surface-sunken" />
      ))}
      <p className="sr-only">Loading your units.</p>
    </div>
  );
}

export function LandlordDashboard({ filter }: { filter: Filter }) {
  const { data: listings, isPending, isError, error } = useMyListings();

  if (isPending) return <Skeleton />;
  if (isError) return <Alert>{error.message}</Alert>;
  if (listings.length === 0) return <ListingsEmptyState />;

  // One sorted array drives both the list and the next-action card, which is
  // why the card can never point at a unit the list buries.
  const ordered = [...listings].sort(byUrgency);
  const shown = ordered.filter((listing) => matchesFilter(listing, filter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-ink-muted">{summaryLine(listings)}</p>
        <ButtonLink href="/landlord/listings/new">Add a unit</ButtonLink>
      </div>

      <NextAction next={selectNextAction(ordered)} />

      <StatusFilter listings={listings} active={filter} />

      {shown.length === 0 && filter !== "all" ? (
        <FilterEmptyState label={NOTHING_MATCHED[filter]} />
      ) : (
        <ul className="space-y-3">
          {shown.map((listing) => (
            <li key={listing.id}>
              <ListingRow listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

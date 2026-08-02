"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { computeTrueMonthlyCost, moveInTotal, totalMonthlyCost } from "@homematch/shared";
import { PiCaretDown, PiImageSquare } from "react-icons/pi";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { peso } from "@/lib/format";
import type { Listing } from "@/features/listings/api/listings.api";
import { useArchiveListing, usePublishListing } from "@/features/listings/hooks/useListings";
import { STATUS_LABEL, statusOf } from "@/features/listings/listing-status";
import type { UnitStatus } from "@/features/listings/listing-status";
import { CostBreakdown } from "./CostBreakdown";
import { ReadinessStatement } from "./ReadinessStatement";

const TYPE_LABEL: Record<string, string> = {
  condo: "Condo",
  apartment: "Apartment",
  boarding_house: "Boarding house",
};

const TONE: Record<UnitStatus, "neutral" | "live" | "blocked" | "ready"> = {
  ready: "ready",
  needs_work: "blocked",
  live: "live",
  archived: "neutral",
};

function Figure({ label, value, unit, strong }: {
  label: string;
  value: string;
  unit?: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[0.625rem] font-medium tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </p>
      <p
        data-figure
        className={
          strong
            ? "text-[1.0625rem] font-bold tracking-[-0.01em] text-ink"
            : "text-[0.9375rem] font-semibold text-ink-soft"
        }
      >
        {value}
        {unit ? (
          <span className="ml-1 text-[0.6875rem] font-medium text-ink-faint">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * One unit, as a row rather than a card in a status column.
 *
 * Status is a badge here instead of a location, so a landlord looking for a
 * particular unit reads one list instead of hunting across four columns for the
 * one that happens to hold it.
 *
 * The true monthly cost sits at heavier weight than the rent — the whole
 * product argument is that the second number is the real one, and a landlord
 * who sees them together understands what renters will see.
 */
export function ListingRow({ listing }: { listing: Listing }) {
  const status = statusOf(listing);
  const publish = usePublishListing();
  const archive = useArchiveListing();
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const cost = computeTrueMonthlyCost({
    rent: listing.rent,
    otherFees: listing.otherFees,
    parkingAvailable: listing.parkingAvailable,
    parkingCost: listing.parkingCost,
  });

  const cover = listing.images.find((image) => image.isPrimary) ?? listing.images[0];
  // Only a bedspace needs a unit stated; "per month" under a label already
  // reading TRUE MONTHLY says the same thing twice.
  const unit = listing.listingType === "bedspace" ? "per bed" : undefined;
  const editHref = `/landlord/listings/${listing.id}/edit`;
  const canGoLive = listing.gaps.length === 0 && listing.status !== "published";

  return (
    <article className="rounded-card border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-card-lift">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-chip bg-surface-sunken">
          {cover ? (
            <Image
              src={cover.url}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full items-center justify-center text-ink-faint">
              <PiImageSquare aria-hidden size={20} />
            </span>
          )}
        </div>

        <div className="min-w-[10rem] flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Link
              href={editHref}
              className="text-[1rem] font-bold tracking-[-0.01em] text-ink transition-colors hover:text-brand"
            >
              {listing.title}
            </Link>
            <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>
          </div>
          <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
            {TYPE_LABEL[listing.propertyType]}
            {listing.barangay ? ` · ${listing.barangay}` : ""}
          </p>
        </div>

        <div className="flex gap-6 sm:ml-auto sm:text-right">
          <Figure label="Rent" value={peso(listing.rent)} />
          <Figure
            label="True monthly"
            value={peso(totalMonthlyCost(cost))}
            unit={unit}
            strong
          />
        </div>
      </div>

      {/* The total is checkable rather than asserted. A landlord who cannot see
          the lines cannot tell a surprising figure from a wrong one. */}
      <details className="disclosure group mt-3">
        <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-chip text-[0.8125rem] font-semibold text-brand hover:text-brand-dark">
          <PiCaretDown
            aria-hidden
            className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
          />
          What makes up {peso(totalMonthlyCost(cost))}
        </summary>
        <div className="mt-2 rounded-chip bg-surface-sunken p-3.5">
          <CostBreakdown
            lines={cost}
            parkingIncluded={listing.parkingAvailable && !listing.parkingCost}
          />
          <p className="mt-3 border-t border-line-strong pt-2.5 text-[0.8125rem] leading-snug text-ink-muted">
            Deposit and advance are{" "}
            <strong className="font-semibold text-ink-soft">
              {peso(
                moveInTotal({
                  rent: listing.rent,
                  depositMonths: listing.depositMonths,
                  advanceMonths: listing.advanceMonths,
                }),
              )}
            </strong>{" "}
            paid once, and are not part of the monthly figure.
          </p>
        </div>
      </details>

      <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <ReadinessStatement gaps={listing.gaps} listingId={listing.id} compact />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canGoLive ? (
            <Button
              onClick={() => publish.mutate(listing.id)}
              disabled={publish.isPending}
            >
              {publish.isPending
                ? "Publishing…"
                : status === "archived"
                  ? "Put back live"
                  : "Publish"}
            </Button>
          ) : null}

          <ButtonLink href={editHref} variant="secondary">
            Edit
          </ButtonLink>

          {listing.status !== "archived" ? (
            <Button
              variant="secondary"
              className="border-transparent px-3 text-ink-muted hover:border-line-strong hover:text-ink"
              onClick={() => setConfirmingArchive(true)}
            >
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      {publish.isError ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
          {publish.error.message}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmingArchive}
        title="Archive this unit?"
        body={
          <>
            <strong className="font-semibold text-ink">{listing.title}</strong> stops
            showing to renters. Everything you have filled in is kept, and you can put it
            back live whenever you want.
          </>
        }
        confirmLabel="Archive it"
        pending={archive.isPending}
        onConfirm={() =>
          archive.mutate(listing.id, { onSuccess: () => setConfirmingArchive(false) })
        }
        onCancel={() => setConfirmingArchive(false)}
      />
    </article>
  );
}

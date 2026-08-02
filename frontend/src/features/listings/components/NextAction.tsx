"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { usePublishListing } from "@/features/listings/hooks/useListings";
import type { NextAction as Next } from "@/features/listings/listing-status";
import { ReadinessStatement } from "./ReadinessStatement";

/**
 * The one thing worth doing next, stated as a sentence and wired to the control
 * that does it.
 *
 * The dashboard used to report state and stop — three counts and four columns,
 * from which a landlord had to work out their own next move by opening a
 * listing. This names it. Everything here is derived from the landlord's own
 * rows: nothing is scheduled, suggested, or invented.
 *
 * Colours follow the contract in `globals.css`: brand for an action that is
 * ready to take, gold for work still owed, live for a state that needs nothing.
 */
const SURFACE = {
  publish: "border-brand-line bg-brand-soft",
  fix: "border-gold-line bg-gold-soft",
  clear: "border-live-line bg-live-soft",
} as const;

export function NextAction({ next }: { next: Next }) {
  const publish = usePublishListing();

  if (next.kind === "clear") {
    return (
      <section
        aria-labelledby="next-action"
        className={`rounded-card border p-5 ${SURFACE.clear}`}
      >
        <h2 id="next-action" className="text-[1.0625rem] font-extrabold text-live-ink">
          Everything you have is live.
        </h2>
        <p className="mt-1 text-[0.9375rem] leading-[1.6] text-ink-soft">
          Renters can see every unit below and decide on all of them. Nothing is waiting
          on you.
        </p>
      </section>
    );
  }

  if (next.kind === "publish") {
    return (
      <section
        aria-labelledby="next-action"
        className={`rounded-card border p-5 ${SURFACE.publish}`}
      >
        <h2 id="next-action" className="text-[1.0625rem] font-extrabold text-brand-deep">
          {next.listing.title} is ready to publish.
        </h2>
        <p className="mt-1 text-[0.9375rem] leading-[1.6] text-ink-soft">
          Nothing is missing. Publish it and renters can start deciding on it today.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => publish.mutate(next.listing.id)}
            disabled={publish.isPending}
          >
            {publish.isPending ? "Publishing…" : "Publish it"}
          </Button>
          <ButtonLink
            href={`/landlord/listings/${next.listing.id}/edit`}
            variant="secondary"
          >
            Look it over first
          </ButtonLink>
        </div>

        {publish.isError ? (
          <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
            {publish.error.message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="next-action"
      className={`rounded-card border p-5 ${SURFACE.fix}`}
    >
      <h2 id="next-action" className="text-[1.0625rem] font-extrabold text-gold-ink">
        {next.listing.title} is closest to going live.
      </h2>
      <p className="mt-1 text-[0.9375rem] leading-[1.6] text-ink-soft">
        {next.listing.gaps.length === 1
          ? "One thing is still missing before renters can decide on it."
          : `${next.listing.gaps.length} things are still missing before renters can decide on it.`}
      </p>

      <div className="mt-4">
        <ReadinessStatement gaps={next.listing.gaps} listingId={next.listing.id} />
      </div>
    </section>
  );
}

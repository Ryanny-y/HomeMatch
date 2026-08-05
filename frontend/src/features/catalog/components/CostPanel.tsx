import type { CSSProperties } from "react";
import { PiWarningCircleFill } from "react-icons/pi";
import type { CostCategory, CatalogListingDto } from "@homematch/shared";
import { moveInTotal } from "@homematch/shared";
import { peso } from "@/lib/format";
import { costOf } from "@/features/catalog/listing-facts";

/**
 * What this unit actually costs, itemised.
 *
 * Not `components/product/CostStatement` — that one is bound to the landing
 * page's six-category fixture and carries the authored motion sequence, neither
 * of which belongs on a listing page. What must not diverge is the arithmetic,
 * and that comes from the shared package here exactly as it does there.
 *
 * The three fills follow the colour contract in `globals.css`: a real listing
 * resolves to rent, parking, and one "other" line, and `other` takes
 * `--color-cat-dues`. The bar and the dots are one fact drawn twice, so they
 * read from this map rather than each picking a colour.
 */
const FILL: Record<CostCategory, string> = {
  rent: "bg-cat-rent",
  parking: "bg-cat-parking",
  other: "bg-cat-dues",
};

const LABEL: Record<CostCategory, string> = {
  rent: "Rent",
  parking: "Parking",
  other: "Other monthly fees",
};

export function CostPanel({ listing }: { listing: CatalogListingDto }) {
  const cost = costOf(listing);
  const moveIn = moveInTotal({
    rent: listing.rent,
    depositMonths: listing.depositMonths,
    advanceMonths: listing.advanceMonths,
  });

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="cost-heading"
        className="rounded-card bg-surface p-6 shadow-card sm:p-7"
      >
        <h2 id="cost-heading" className="text-xl">
          What this actually costs
        </h2>

        <div
          aria-hidden
          className="mt-5 flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
        >
          {cost.lines.map((line) => (
            <span
              key={line.category}
              className={`w-(--share) ${FILL[line.category]} first:rounded-l-full last:rounded-r-full`}
              style={
                { "--share": `${(line.amount / cost.total) * 100}%` } as CSSProperties
              }
            />
          ))}
        </div>

        <dl className="mt-5">
          {cost.lines.map((line) => (
            <div
              key={line.category}
              className="flex items-center justify-between gap-4 border-b border-line py-2.5"
            >
              <dt className="flex items-center gap-2.5 text-[0.9375rem] text-ink-soft">
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${FILL[line.category]}`}
                />
                {LABEL[line.category]}
              </dt>
              <dd data-figure className="text-[0.9375rem] font-semibold text-ink">
                {peso(line.amount)}
              </dd>
            </div>
          ))}

          <div className="flex items-center justify-between gap-4 pt-3.5">
            <dt className="font-bold text-ink">True monthly cost</dt>
            <dd
              data-figure
              className="text-[1.5rem] leading-none font-extrabold tracking-[-0.03em] text-ink"
            >
              {peso(cost.total)}
            </dd>
          </div>
        </dl>

        {/*
         * The one place `--color-danger` is spent.
         *
         * The colour contract reserves it for exactly this gap and says "once".
         * It is absent from the browse grid so it can land here, and it is
         * absent from listings where rent really is the whole cost — a red
         * callout reading "₱0 more" would be alarm without a fact.
         */}
        {cost.beyondRent > 0 ? (
          <p className="mt-5 flex items-start gap-2.5 rounded-chip border border-danger-line bg-danger-soft px-3.5 py-3 text-[0.875rem] text-ink-soft">
            <PiWarningCircleFill
              aria-hidden
              className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-danger"
            />
            <span>
              <strong className="font-bold text-ink">
                <span data-figure>{peso(cost.beyondRent)}</span> more than the
                advertised rent
              </strong>{" "}
              of <span data-figure>{peso(cost.rent)}</span>. That gap is what most
              listings leave you to find out later.
            </span>
          </p>
        ) : (
          <p className="mt-5 rounded-chip bg-surface-sunken px-3.5 py-3 text-[0.875rem] text-ink-soft">
            Rent is the whole monthly cost here. Nothing else is charged on top.
          </p>
        )}
      </section>

      {/*
       * Move-in sits in its own card rather than as another line above, because
       * a one-time payment folded into a monthly figure is precisely the
       * arithmetic this product exists to refuse. See the note on
       * `computeTrueMonthlyCost` in the shared package.
       */}
      <section
        aria-labelledby="movein-heading"
        className="rounded-card bg-surface p-6 shadow-card sm:p-7"
      >
        <h2 id="movein-heading" className="text-xl">
          Before you move in
        </h2>
        <p
          data-figure
          className="mt-3 text-[1.75rem] leading-none font-extrabold tracking-[-0.03em] text-ink"
        >
          {peso(moveIn)}
        </p>
        <p className="mt-2.5 text-[0.9375rem] text-ink-muted">
          {listing.depositMonths} {listing.depositMonths === 1 ? "month" : "months"}{" "}
          deposit + {listing.advanceMonths}{" "}
          {listing.advanceMonths === 1 ? "month" : "months"} advance, due at signing.
          A one-time cost, never folded into the monthly figure above.
        </p>
      </section>
    </div>
  );
}

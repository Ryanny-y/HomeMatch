import Link from "next/link";
import type { IconType } from "react-icons";
import { PiBathtub, PiBed, PiCar, PiDog, PiUsersThree } from "react-icons/pi";
import type { CatalogListingDto } from "@homematch/shared";
import { peso } from "@/lib/format";
import { ListingPhoto } from "@/features/catalog/components/ListingPhoto";
import {
  badgeFor,
  costOf,
  factsFor,
  listedAgo,
  placeOf,
  receiptFor,
} from "@/features/catalog/listing-facts";

/**
 * One listing in the catalog.
 *
 * **The headline figure is the true monthly cost, not the advertised rent.**
 * Every other listing site puts rent in this slot; a unit at ₱24,000 with
 * ₱1,500 of parking is ₱25,500 to live in, and which of those two numbers a
 * renter sees first is the entire difference this product is claiming. The
 * receipt sits directly beneath so the figure can be checked rather than taken
 * on trust.
 *
 * Colour is deliberately absent. `--color-danger` is the token for the
 * rent-versus-true-cost gap, but the contract in `globals.css` spends it once —
 * and a grid of red deltas would turn a fact into an alarm and leave nothing
 * for the detail page, where the gap gets its full statement.
 */

const FACT_ICON: Record<string, IconType> = {
  beds: PiBed,
  baths: PiBathtub,
  bath: PiBathtub,
  parking: PiCar,
  pets: PiDog,
  type: PiUsersThree,
  gender: PiUsersThree,
};

export function ListingCard({
  listing,
  priority = false,
}: {
  listing: CatalogListingDto;
  /** True for the first row, so the largest-contentful paint is not lazy. */
  priority?: boolean;
}) {
  const cost = costOf(listing);
  const facts = factsFor(listing);
  const badge = badgeFor(listing);

  return (
    /**
     * `h-full` matters more than it looks. The grid already stretches every
     * `<li>` to the tallest card in the row, but the card inside was sized by
     * its own content — so a listing with no beds, baths or parking rendered no
     * fact row and stopped 54px short of its neighbours, taking its button up
     * with it. This fills the space the grid had already reserved.
     */
    <article className="flex h-full flex-col gap-3.5 rounded-card bg-surface p-3 shadow-card">
      <div className="relative">
        <ListingPhoto
          image={listing.images[0]}
          alt={listing.title}
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
          priority={priority}
          className="aspect-[4/3]"
        />
        {badge ? (
          <p className="absolute top-2.5 left-2.5 rounded-full bg-surface/95 px-2.5 py-1 text-[0.71875rem] font-bold text-ink shadow-[0_1px_3px_rgb(15_23_42/0.16)] backdrop-blur-sm">
            {badge}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-0.5 pb-0.5">
        <div>
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span
              data-figure
              className="text-[1.5625rem] leading-none font-extrabold tracking-[-0.035em] text-ink"
            >
              {peso(cost.total)}
            </span>
            <span className="text-[0.8125rem] font-medium text-ink-muted">
              per month
            </span>
          </p>
          <p data-figure className="mt-1.5 text-[0.78125rem] text-ink-muted">
            {receiptFor(cost)}
          </p>
        </div>

        <div>
          {/* h2, not h3: the cards sit directly under the page's h1 and there
              is no intervening section, so h3 would skip a level. */}
          <h2 className="line-clamp-2 text-[0.96875rem] leading-snug font-bold tracking-[-0.015em] text-ink">
            {listing.title}
          </h2>
          <p className="mt-0.5 text-[0.78125rem] text-ink-muted">{placeOf(listing)}</p>
        </div>

        {facts.length > 0 ? (
          <ul className="flex items-center border-t border-line py-2.5">
            {facts.map((fact, index) => {
              const Icon = FACT_ICON[fact.key];

              return (
                <li
                  key={fact.key}
                  className={`flex items-center gap-1.5 px-2.5 text-[0.78125rem] whitespace-nowrap text-ink-soft first:pl-0 ${
                    index > 0 ? "border-l border-line" : ""
                  }`}
                >
                  {Icon ? <Icon aria-hidden className="h-[0.9375rem] w-[0.9375rem] shrink-0 text-ink-faint" /> : null}
                  {fact.figure ? (
                    <span data-figure className="font-bold text-ink">
                      {fact.figure}
                    </span>
                  ) : null}
                  {fact.label}
                </li>
              );
            })}
          </ul>
        ) : null}

        {/*
         * The foot of the card, pinned by `mt-auto` so the buttons line up
         * across a row however much a listing had to say. The slack collects
         * above this block rather than under it — pinning the button alone
         * would leave "Listed…" stranded in the middle of a sparse card.
         *
         * It carries the hairline that used to be the fact row's lower border,
         * so a listing with no facts still gets one divider instead of ending
         * in a bare gap.
         */}
        <div className="mt-auto border-t border-line pt-3">
          <p className="font-mono text-[0.65625rem] tracking-[0.1em] text-ink-faint uppercase">
            {listedAgo(listing.publishedAt)}
          </p>

          {/* The card is not itself a link. Wrapping this button in one would
              nest two interactive elements, giving every card two tab stops for
              one destination and an ambiguous accessible name. */}
          <Link
            href={`/listings/${listing.slug}`}
            className="mt-3 block rounded-chip bg-brand px-4 py-2.5 text-center text-sm font-bold tracking-[-0.01em] text-white transition-colors duration-(--dur-state) ease-(--ease-state) hover:bg-brand-dark"
          >
            View details
            <span className="sr-only"> for {listing.title}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

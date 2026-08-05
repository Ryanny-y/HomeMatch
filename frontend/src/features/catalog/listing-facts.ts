import type { CostLine, CatalogListingDto } from "@homematch/shared";
import { computeTrueMonthlyCost, totalMonthlyCost } from "@homematch/shared";
import { peso } from "@/lib/format";

/**
 * Everything the card and the detail page derive from a listing.
 *
 * Kept out of the components because both render the same facts at different
 * sizes, and two copies of "is this a bedspace or a whole unit" would eventually
 * disagree.
 */

export type ListingCost = {
  lines: CostLine[];
  total: number;
  /** What the listing advertises, before anything else it charges monthly. */
  rent: number;
  /** `total - rent`. Zero when rent is the whole story. */
  beyondRent: number;
};

const CATEGORY_LABEL: Record<CostLine["category"], string> = {
  rent: "rent",
  parking: "parking",
  other: "other fees",
};

export function costOf(listing: CatalogListingDto): ListingCost {
  const lines = computeTrueMonthlyCost({
    rent: listing.rent,
    otherFees: listing.otherFees,
    parkingAvailable: listing.parkingAvailable,
    parkingCost: listing.parkingCost,
  });

  const total = totalMonthlyCost(lines);

  return { lines, total, rent: listing.rent, beyondRent: total - listing.rent };
}

/**
 * The line under the headline figure, which exists to make that figure
 * checkable rather than merely asserted.
 *
 * When rent is the entire cost this says so in words instead of rendering a
 * one-item breakdown — a lone "₱14,500 rent" beneath a ₱14,500 total reads as a
 * rendering bug, and "nothing on top" is the more useful fact anyway.
 */
export function receiptFor(cost: ListingCost): string {
  if (cost.lines.length <= 1) return "Rent only, nothing on top";

  return cost.lines
    .map((line) => `${peso(line.amount)} ${CATEGORY_LABEL[line.category]}`)
    .join(" + ");
}

export type ListingFact = {
  key: string;
  /** Rendered before the label, e.g. the "2" in "2 Beds". */
  figure?: string;
  label: string;
};

/**
 * The three-or-fewer facts a card shows.
 *
 * A bedspace has no bedroom or bathroom count — the unit of sale is a bed, so
 * those columns are null by design — and printing "0 Beds" for one would be
 * false rather than merely empty. It gets the facts it actually has.
 */
export function factsFor(listing: CatalogListingDto): ListingFact[] {
  if (listing.listingType === "bedspace") {
    const facts: ListingFact[] = [{ key: "type", label: "Bedspace" }];

    if (listing.bathroomAccess) {
      facts.push({
        key: "bath",
        label: listing.bathroomAccess === "private" ? "Private bath" : "Shared bath",
      });
    }

    if (listing.genderPolicy && listing.genderPolicy !== "any") {
      facts.push({
        key: "gender",
        label: listing.genderPolicy === "female_only" ? "Women only" : "Men only",
      });
    }

    return facts;
  }

  const facts: ListingFact[] = [];

  if (listing.bedrooms !== null) {
    facts.push({
      key: "beds",
      figure: String(listing.bedrooms),
      label: listing.bedrooms === 1 ? "Bed" : "Beds",
    });
  }

  if (listing.bathrooms !== null) {
    facts.push({
      key: "baths",
      figure: String(listing.bathrooms),
      label: listing.bathrooms === 1 ? "Bath" : "Baths",
    });
  }

  if (listing.parkingAvailable) facts.push({ key: "parking", label: "Parking" });
  else if (listing.petsAllowed) facts.push({ key: "pets", label: "Pets OK" });

  return facts;
}

/**
 * The badge over the photo, or nothing.
 *
 * The reference this card follows puts a "Prime Pick" ribbon here. Nothing in
 * the schema ranks a listing, so rather than invent a signal the slot carries
 * one genuinely useful binary where the listing has one, and stays empty where
 * it does not. Order is by what a renter decides on first.
 */
export function badgeFor(listing: CatalogListingDto): string | null {
  if (listing.utilitiesIncluded) return "Utilities included";
  if (listing.genderPolicy === "female_only") return "Women only";
  if (listing.genderPolicy === "male_only") return "Men only";
  if (listing.furnished) return "Furnished";

  return null;
}

export function placeOf(listing: CatalogListingDto): string {
  return [listing.barangay, listing.city].filter(Boolean).join(" · ");
}

/**
 * "3 days ago", from a real `publishedAt`.
 *
 * `Intl.RelativeTimeFormat` rather than a hand-rolled ladder, so the wording is
 * the browser's and stays correct at the boundaries.
 */
const relative = new Intl.RelativeTimeFormat("en-PH", { numeric: "auto" });
const DAY_MS = 86_400_000;

export function listedAgo(publishedAt: string): string {
  const days = Math.round((Date.parse(publishedAt) - Date.now()) / DAY_MS);

  if (days > -1) return "Listed today";
  if (days > -30) return `Listed ${relative.format(days, "day")}`;

  return `Listed ${relative.format(Math.round(days / 30), "month")}`;
}

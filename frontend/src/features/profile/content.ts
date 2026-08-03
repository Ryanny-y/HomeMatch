import type { RenterWant } from "@homematch/shared";

/**
 * The six wants, in the order they are shown.
 *
 * Ordered so the ones that most often decide a viewing come first, rather than
 * alphabetically or in schema order — a renter who reads two rows and stops
 * should have seen the ones most likely to matter.
 *
 * These hints are written to match the landlord's wording for the same field in
 * `EditListingForm`. Both sides are describing one fact, and a renter ticking
 * "near transit" has to mean what the landlord ticked.
 */
export const WANTS: readonly { value: RenterWant; label: string; hint: string }[] = [
  { value: "pets", label: "Pets allowed", hint: "Cats and dogs both count." },
  {
    value: "parking",
    label: "Parking included",
    hint: "A slot with the unit, not street parking.",
  },
  {
    value: "own_bathroom",
    label: "Own bathroom",
    hint: "Not shared with another unit.",
  },
  {
    value: "furnished",
    label: "Furnished",
    hint: "At least a bed and a place to cook.",
  },
  {
    value: "near_transit",
    label: "Near transit",
    hint: "Walking distance to a jeepney, bus, or train.",
  },
  { value: "aircon", label: "Aircon", hint: "Installed, not just an outlet for one." },
];

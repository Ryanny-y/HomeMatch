import { z } from "zod";

/**
 * The renter preference contract — the input side of the match score.
 *
 * Stage 4's rules engine scores every listing *against* these fields, so they
 * live here rather than on either side: the API validates a PATCH with the same
 * object the form validates a keystroke with, and the scorer will read the same
 * types. Two copies would drift and the score would start disagreeing with the
 * profile that produced it.
 *
 * Six fields. A budget, how many people have to fit, a list of wants, a box for
 * whatever the list misses, and the areas the renter will live in.
 *
 * The location pair is the newest and the odd one out: everything else here is
 * *scored*, while `preferredCity` and `preferredBarangays` are *filtered* on.
 * They were added when the catalog gained filters, because the location wants
 * already collected in `otherNeeds` are prose and prose cannot be a `WHERE`
 * clause. `otherNeeds` keeps its job unchanged.
 *
 * Layout, copy, and states for the surface these fields drive are specified in
 * `docs/design/profile-surface.md`.
 */

/**
 * What a renter wants in a place.
 *
 * One flat list rather than a disqualifying tier and a weighted tier. Which of
 * these is truly non-negotiable varies per renter and per search, and asking
 * someone to declare it up front gets a worse answer than reading it out of
 * their own words later.
 *
 * **Every value maps 1:1 to a field on `ListingDto`** — `pets` to
 * `petsAllowed`, `parking` to `parkingAvailable`, `own_bathroom` to
 * `bathroomAccess`, and the rest to fields of the same name. That is what keeps
 * the list short: a want with nothing on the listing to compare against cannot
 * be scored, so it is data the product collects and never uses. `quiet_street`,
 * `laundry` and `step_free` were removed for exactly that reason. Adding a
 * value here means adding the listing field in the same change.
 */
export const renterWantSchema = z.enum([
  "pets",
  "parking",
  "own_bathroom",
  "furnished",
  "near_transit",
  "aircon",
]);

export type RenterWant = z.infer<typeof renterWantSchema>;

/**
 * Sanity bounds, not policy.
 *
 * They exist to catch a fat-fingered figure — a ₱180,000 budget typed as
 * ₱1,800,000 — and are deliberately far outside any real Quezon City rent
 * rather than tuned to the market. A bound that rejects a legitimate answer is
 * worse than no bound.
 */
export const MAX_BUDGET = 1_000_000;
export const MAX_HOUSEHOLD_SIZE = 12;
export const MAX_OTHER_NEEDS_LENGTH = 500;

/**
 * Bounds on the location fields, in the same spirit: wide enough that no
 * genuine answer hits them.
 *
 * The barangay cap is the one with an actual argument behind it. A renter who
 * marks twenty areas has expressed no preference at all, and the saved set
 * becomes the default catalog filter — so an unbounded list is a filter that
 * silently stops filtering, plus a row of chips nobody can read.
 */
export const MAX_PREFERRED_BARANGAYS = 10;
export const MAX_PLACE_NAME_LENGTH = 80;

/** Every field is optional: a partial profile is a first-class state. */
export const updateRenterPreferenceSchema = z.object({
  budget: z
    .number()
    .positive("Enter an amount above zero.")
    .max(MAX_BUDGET, "That's above ₱1,000,000 a month. Check the figure.")
    .nullable()
    .optional(),

  householdSize: z
    .number()
    .int()
    .min(1, "Enter a number between 1 and 12.")
    .max(MAX_HOUSEHOLD_SIZE, "Enter a number between 1 and 12.")
    .nullable()
    .optional(),

  wants: z.array(renterWantSchema).optional(),

  otherNeeds: z
    .string()
    .trim()
    .max(MAX_OTHER_NEEDS_LENGTH, "Keep this under 500 characters.")
    .nullable()
    .optional(),

  preferredCity: z
    .string()
    .trim()
    .max(MAX_PLACE_NAME_LENGTH, "That's too long to be a city name.")
    .nullable()
    .optional(),

  /**
   * `.min(1)` on each entry rather than on the array: an empty list is how a
   * renter clears their areas, but a blank string inside one is a chip that
   * renders as nothing and matches no listing.
   */
  preferredBarangays: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Pick an area or leave it out.")
        .max(MAX_PLACE_NAME_LENGTH, "That's too long to be a barangay name."),
    )
    .max(MAX_PREFERRED_BARANGAYS, "Pick up to 10 areas.")
    .optional(),
});

export type UpdateRenterPreferenceInput = z.infer<typeof updateRenterPreferenceSchema>;

export type RenterPreferenceDto = {
  budget: number | null;
  householdSize: number | null;
  wants: RenterWant[];
  otherNeeds: string | null;
  preferredCity: string | null;
  preferredBarangays: string[];
  /**
   * When onboarding was finished or skipped, or `null` if the renter has not
   * been through it. Read by `/onboarding` to decide whether to show itself.
   */
  onboardedAt: string | null;
  updatedAt: string | null;
};

/**
 * A renter who has saved nothing.
 *
 * Returned instead of a 404 so the page always has a profile to render — "you
 * have set nothing" is a state the surface is designed for, not an error.
 */
export const EMPTY_RENTER_PREFERENCE: RenterPreferenceDto = {
  budget: null,
  householdSize: null,
  wants: [],
  otherNeeds: null,
  preferredCity: null,
  preferredBarangays: [],
  onboardedAt: null,
  updatedAt: null,
};

/**
 * Whether the rules engine can rank anything for this renter.
 *
 * A budget alone is a filter, not a match — it can only tell you what is too
 * expensive. Ranking needs something to rank *on*, which is what the wants and
 * the written needs supply. Below this bar a "ranked" list is posting order
 * wearing a score's clothes, and the empty state says so, so the rule behind it
 * lives in one place rather than being restated in copy.
 */
export function canScoreListings(preference: RenterPreferenceDto): boolean {
  return (
    preference.budget !== null &&
    (preference.wants.length > 0 || preference.otherNeeds !== null)
  );
}

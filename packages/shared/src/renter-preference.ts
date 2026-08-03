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
 * Four fields, deliberately. A budget, how many people have to fit, a list of
 * wants, and a box for whatever the list misses.
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
 */
export const renterWantSchema = z.enum([
  "pets",
  "parking",
  "step_free",
  "own_bathroom",
  "furnished",
  "near_transit",
  "quiet_street",
  "aircon",
  "laundry",
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
});

export type UpdateRenterPreferenceInput = z.infer<typeof updateRenterPreferenceSchema>;

export type RenterPreferenceDto = {
  budget: number | null;
  householdSize: number | null;
  wants: RenterWant[];
  otherNeeds: string | null;
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

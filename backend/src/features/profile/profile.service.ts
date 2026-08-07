import type { RenterPreferenceDto, UpdateRenterPreferenceInput } from "@homematch/shared";
import { EMPTY_RENTER_PREFERENCE } from "@homematch/shared";
import type { AuthContext } from "../../shared/middleware/requireAuth";
import * as repo from "./profile.repository";
import type { RenterPreferenceRow, RenterPreferenceWrite } from "./profile.repository";

/**
 * Renter preference business logic.
 *
 * `requireRole("renter")` upstream answers whether the caller is a renter at
 * all. There is no per-record ownership question here — a renter has exactly
 * one profile and it is keyed by their own id, so a request can only ever reach
 * its own row.
 */

/** Prisma returns Decimal for money columns; the wire carries plain numbers. */
function toNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function toDto(row: RenterPreferenceRow): RenterPreferenceDto {
  return {
    budget: toNullableNumber(row.budget),
    householdSize: row.householdSize,
    wants: row.wants,
    otherNeeds: row.otherNeeds,
    preferredCity: row.preferredCity,
    preferredBarangays: row.preferredBarangays,
    onboardedAt: row.onboardedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Translates a validated patch into columns.
 *
 * Only keys the caller actually sent are copied. `undefined` means "not in this
 * request" and `null` means "clear this field", and Prisma reads them the same
 * way — so passing a key through unconditionally would turn every unsent field
 * into a deliberate wipe.
 */
function toWrite(input: UpdateRenterPreferenceInput): RenterPreferenceWrite {
  const write: RenterPreferenceWrite = {};

  if (input.budget !== undefined) write.budget = input.budget;
  if (input.householdSize !== undefined) write.householdSize = input.householdSize;
  if (input.wants !== undefined) write.wants = input.wants;

  if (input.otherNeeds !== undefined) {
    // Text trimmed to nothing is erased text, not an empty string, so the
    // column holds one representation of "nothing here".
    write.otherNeeds = input.otherNeeds === null || input.otherNeeds === "" ? null : input.otherNeeds;
  }

  if (input.preferredCity !== undefined) {
    write.preferredCity =
      input.preferredCity === null || input.preferredCity === "" ? null : input.preferredCity;
  }

  if (input.preferredBarangays !== undefined) {
    // Deduplicated here rather than in the schema, so a client that sends the
    // same area twice gets it stored once instead of a 422 for a mistake the
    // renter cannot see and did not make.
    write.preferredBarangays = [...new Set(input.preferredBarangays)];
  }

  return write;
}

/**
 * The caller's profile, or an empty one.
 *
 * A renter who has saved nothing gets `EMPTY_RENTER_PREFERENCE` rather than a
 * 404: the page is designed to render "you have set nothing", and a 404 would
 * make the first visit look like a failure.
 */
export async function getMine(actor: AuthContext): Promise<RenterPreferenceDto> {
  const row = await repo.findByUserId(actor.userId);
  return row ? toDto(row) : EMPTY_RENTER_PREFERENCE;
}

export async function updateMine(
  input: UpdateRenterPreferenceInput,
  actor: AuthContext,
): Promise<RenterPreferenceDto> {
  return toDto(await repo.upsertForUser(actor.userId, toWrite(input)));
}

/**
 * Records that the renter has been through the first-run gate.
 *
 * Its own operation rather than a side effect of saving, because skipping is a
 * legitimate way through and writes no preferences at all. Folding it into the
 * PATCH would also make every later profile edit look like a fresh onboarding.
 *
 * Not part of `updateRenterPreferenceSchema`: the timestamp is the server's to
 * set, and a client that could send it could claim to have onboarded in 1970.
 */
export async function markOnboarded(actor: AuthContext): Promise<RenterPreferenceDto> {
  return toDto(await repo.markOnboarded(actor.userId));
}

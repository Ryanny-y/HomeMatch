import type { RenterPreferenceDto, UpdateRenterPreferenceInput } from "@homematch/shared";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

/**
 * The renter profile contract.
 *
 *   GET   /api/profile             → the caller's preferences, or an empty set
 *   PATCH /api/profile             partial; only the keys sent are written
 *   POST  /api/profile/onboarded   stamps `onboardedAt`, once
 *
 * There is no id in any path — the row is keyed by the session's own user, so a
 * renter can only ever reach their own.
 */

export const profileKeys = {
  mine: () => ["profile", "mine"] as const,
};

export function fetchProfile(): Promise<RenterPreferenceDto> {
  return apiGet<{ preference: RenterPreferenceDto }>("/api/profile").then(
    (d) => d.preference,
  );
}

export function updateProfile(
  input: UpdateRenterPreferenceInput,
): Promise<RenterPreferenceDto> {
  return apiPatch<{ preference: RenterPreferenceDto }>("/api/profile", input).then(
    (d) => d.preference,
  );
}

/** Idempotent server-side, so a retry or a double-click cannot move the date. */
export function markOnboarded(): Promise<RenterPreferenceDto> {
  return apiPost<{ preference: RenterPreferenceDto }>("/api/profile/onboarded", {}).then(
    (d) => d.preference,
  );
}

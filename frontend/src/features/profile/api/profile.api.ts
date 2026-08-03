import type { RenterPreferenceDto, UpdateRenterPreferenceInput } from "@homematch/shared";
import { apiGet, apiPatch } from "@/lib/api";

/**
 * The renter profile contract.
 *
 *   GET   /api/profile   → the caller's preferences, or an empty set
 *   PATCH /api/profile   partial; only the keys sent are written
 *
 * There is no id in either path — the row is keyed by the session's own user,
 * so a renter can only ever reach their own.
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

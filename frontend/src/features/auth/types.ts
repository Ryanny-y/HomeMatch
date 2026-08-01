export type { AuthenticatedUser } from "@homematch/shared";

/**
 * Field-keyed messages rendered under inputs. Keys match schema field names.
 *
 * This one stays local: it describes how *this* UI renders errors, not anything
 * the API promises. `AuthenticatedUser` moved to the shared package because it
 * is a wire shape and both sides must agree on it.
 */
export type FieldErrors = Record<string, string>;

/**
 * Canonical error codes. The root CLAUDE.md forbids inline magic code strings,
 * so every `AppError` on the backend and every `ApiError` check on the frontend
 * refers to one of these constants.
 */

export const ERROR_CODES = {
  /** Request body/params failed schema validation. Maps to HTTP 422. */
  VALIDATION_ERROR: "VALIDATION_ERROR",
  /** Request was malformed before validation could run. Maps to HTTP 400. */
  BAD_REQUEST: "BAD_REQUEST",
  /** Requested resource does not exist. Maps to HTTP 404. */
  NOT_FOUND: "NOT_FOUND",
  /** Request conflicts with current state (e.g. duplicate). Maps to HTTP 409. */
  CONFLICT: "CONFLICT",
  /** Caller is not authenticated. Maps to HTTP 401. */
  UNAUTHORIZED: "UNAUTHORIZED",
  /**
   * Caller is authenticated but not allowed to do this. Maps to HTTP 403.
   * Distinct from UNAUTHORIZED because the client's response differs: a 401
   * means sign in, a 403 means signing in again will not help.
   */
  FORBIDDEN: "FORBIDDEN",
  /** Caller exceeded a rate limit. Maps to HTTP 429. */
  RATE_LIMITED: "RATE_LIMITED",
  /** Unhandled failure. Maps to HTTP 500 with a generic client message. */
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** The frontend could not reach the API at all. Client-side only. */
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

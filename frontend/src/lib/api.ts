import {
  ERROR_CODES,
  isApiSuccess,
  type ApiResponse,
  type ErrorCode,
} from "@homematch/shared";

/**
 * The single place a response becomes data-or-throw.
 *
 * Auth uses JWTs in httpOnly cookies, so this module never reads, stores, or
 * attaches a token — it only sets `credentials: "include"` so the browser
 * carries the cookie.
 *
 * It also owns the silent refresh: a 401 triggers one shared call to
 * `/api/auth/refresh` and a replay of the original request. That lives here
 * rather than in a feature so every caller gets it, and so there is exactly one
 * refresh path — see the note on `refreshInFlight` for why more than one is
 * actively harmful.
 *
 * Every response arrives in the shared `ApiResponse` envelope. Failures throw
 * `ApiError` rather than returning a result union, so callers have one error
 * path and TanStack Query can take over unchanged once it is adopted.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }

  /** Field-keyed messages from a 422, e.g. `{ email: "Already in use" }`. */
  get fieldErrors(): Record<string, string> {
    if (this.code !== ERROR_CODES.VALIDATION_ERROR) return {};
    if (typeof this.details !== "object" || this.details === null) return {};

    const issues = (this.details as { issues?: unknown }).issues;

    if (Array.isArray(issues)) {
      const fields: Record<string, string> = {};

      for (const issue of issues) {
        if (typeof issue !== "object" || issue === null) continue;
        const { path, message } = issue as { path?: unknown; message?: unknown };
        if (typeof message !== "string") continue;

        const key = Array.isArray(path) ? path.join(".") : undefined;
        if (key && !fields[key]) fields[key] = message;
      }

      return fields;
    }

    const fields: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.details)) {
      if (typeof value === "string") fields[key] = value;
      else if (Array.isArray(value) && typeof value[0] === "string") {
        fields[key] = value[0];
      }
    }

    return fields;
  }
}

function unreachable(): ApiError {
  return new ApiError(
    ERROR_CODES.NETWORK_ERROR,
    "We couldn't reach HomeMatch. Check your connection and try again.",
  );
}

const REFRESH_PATH = "/api/auth/refresh";

/**
 * The in-flight refresh, shared by every caller.
 *
 * **This is not an optimisation — without it the app signs users out.** The
 * access token lasts 15 minutes, so when it expires every request on the page
 * 401s at once. If each retried independently, they would all POST to
 * `/refresh` carrying the same refresh token; the first rotates it and the rest
 * arrive at a token that is already spent. The server reads that as a stolen
 * token, revokes the whole family, and the user is thrown out mid-task having
 * done nothing wrong.
 *
 * Sharing one promise means one refresh happens and everyone waits for it.
 *
 * The server also keeps a short grace window for the same reason, because two
 * browser tabs are two JavaScript contexts and cannot share this variable. Both
 * halves are needed; neither is sufficient.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_URL}${REFRESH_PATH}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      // Cleared so the *next* expiry starts a fresh attempt rather than
      // resolving instantly against a stale result.
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function request<T>(
  path: string,
  init: RequestInit,
  retryOn401 = true,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw unreachable();
  }

  /**
   * A 401 usually just means the 15-minute access token lapsed. Refresh once
   * and replay, so an expired token is invisible to the user.
   *
   * `retryOn401` guards the recursion: the replayed request must not refresh
   * again, and a 401 from `/refresh` itself means the session is genuinely over
   * — retrying it would loop.
   */
  if (response.status === 401 && retryOn401 && path !== REFRESH_PATH) {
    const refreshed = await refreshSession();

    if (refreshed) {
      return request<T>(path, init, false);
    }
  }

  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // A non-JSON body means something upstream of the API answered — a proxy,
    // a load balancer, an HTML error page. Treat it as unreachable rather than
    // guessing at a code the server never sent.
    throw unreachable();
  }

  if (isApiSuccess(payload)) return payload.data;

  // A success carrying no payload — what forgot-password, reset-password, and
  // verify-email return. `isApiSuccess` requires non-null data, so it rejects
  // these; they are still successes.
  if (payload.success) return undefined as T;

  const error = payload.error;

  throw new ApiError(
    error?.code ?? ERROR_CODES.INTERNAL_ERROR,
    error?.message ?? "Something went wrong on our end. Please try again.",
    error?.details,
  );
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

/** Narrows an unknown catch binding to a message the UI can render. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(
    ERROR_CODES.INTERNAL_ERROR,
    "Something went wrong. Please try again.",
  );
}

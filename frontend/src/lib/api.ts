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

async function request<T>(path: string, init: RequestInit): Promise<T> {
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

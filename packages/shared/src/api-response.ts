

import type { ErrorCode } from "./error-codes";

export type ApiError = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: Record<string, unknown>;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  error: null;
  meta?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  success: false;
  data: null;
  error: ApiError;
  meta?: Record<string, unknown>;
};

export function isApiSuccess<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true && response.data !== null;
}

/**
 * The fixed pagination shape every list endpoint puts in `meta`.
 *
 * Here rather than backend-side because both ends need it: the server builds it
 * and the client reads it to render a pager. Do not invent a per-endpoint
 * variant.
 */
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
};

/** Whether an envelope's `meta` carries the pagination shape. */
export function isPaginated(meta: unknown): meta is PaginationMeta {
  if (typeof meta !== "object" || meta === null) return false;

  const candidate = meta as Partial<PaginationMeta>;

  return (
    typeof candidate.page === "number" &&
    typeof candidate.pageSize === "number" &&
    typeof candidate.total === "number"
  );
}

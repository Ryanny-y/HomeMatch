import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ErrorCode,
  PaginationMeta,
} from "@homematch/shared";

export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessResponse<T> {
  return meta === undefined
    ? { success: true, data, error: null }
    : { success: true, data, error: null, meta };
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    data: null,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}

export type { PaginationMeta };

export function paginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  return { page, pageSize, total };
}

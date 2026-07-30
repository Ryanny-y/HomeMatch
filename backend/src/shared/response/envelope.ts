import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ErrorCode,
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

/** The fixed pagination shape. Do not invent a per-endpoint variant. */
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export function paginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  return { page, pageSize, total };
}

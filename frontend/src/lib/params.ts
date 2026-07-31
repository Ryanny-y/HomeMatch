export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * A query key can legally repeat (`?token=a&token=b`), so Next hands back
 * `string | string[]`. Every consumer here wants one value, and taking the
 * first is the same rule the API applies.
 */
export function firstParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

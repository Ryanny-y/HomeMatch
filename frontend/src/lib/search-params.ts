/**
 * Collapses Next's `searchParams` to one value per key.
 *
 * A repeated key (`?role=renter&role=admin`) arrives as an array, which no
 * filter schema here accepts. Taking the first is the same thing a browser form
 * would have sent, and is friendlier than rejecting the whole URL over a
 * duplicate somebody pasted.
 */
export function firstValues(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;

    if (single !== undefined) flat[key] = single;
  }

  return flat;
}

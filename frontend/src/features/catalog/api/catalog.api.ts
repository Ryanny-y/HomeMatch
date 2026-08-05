import type { BrowseQuery, CatalogListingDto } from "@homematch/shared";
import { apiGet, apiGetPage, withQuery } from "@/lib/api";
import { forwardedCookies } from "@/lib/session";

/**
 * The catalog's read layer.
 *
 * Server-only: both functions forward the caller's cookie, which they read from
 * `next/headers`. That is not an optimisation — `/api/catalog` sits behind
 * `requireAuth`, and a server-side fetch carries no cookie jar of its own, so
 * without the forwarded header every one of these calls 401s.
 *
 * Called from Server Components rather than a query hook because the catalog
 * pages hold no client state and have nothing for TanStack Query to keep in
 * sync.
 */

export async function fetchPublishedListings(
  query: Partial<BrowseQuery>,
): Promise<{ listings: CatalogListingDto[]; total: number }> {
  const cookie = await forwardedCookies();

  const { data, meta } = await apiGetPage<{ listings: CatalogListingDto[] }>(
    withQuery("/api/catalog/listings", { page: query.page, pageSize: query.pageSize }),
    cookie ? { cookie } : undefined,
  );

  return { listings: data.listings, total: meta.total };
}

export async function fetchListingBySlug(slug: string): Promise<CatalogListingDto> {
  const cookie = await forwardedCookies();

  const { listing } = await apiGet<{ listing: CatalogListingDto }>(
    `/api/catalog/listings/${encodeURIComponent(slug)}`,
    cookie ? { cookie } : undefined,
  );

  return listing;
}

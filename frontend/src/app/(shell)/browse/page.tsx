import type { Metadata } from "next";

import { browseQuerySchema } from "@homematch/shared";
import { BrowseScreen, fetchPublishedListings } from "@/features/catalog";
import { firstValues } from "@/lib/search-params";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Browse apartments in Quezon City",
  description:
    "Hand-checked apartments, condos and bedspaces in Quezon City, each showing what it actually costs per month rather than the advertised rent.",
  // The catalog needs an account, so a crawler reaching this URL is bounced to
  // the login page. Left indexable, that is what would get indexed.
  robots: { index: false, follow: false },
};

/**
 * The catalog, for signed-in users.
 *
 * `requireUser` before the fetch so an anonymous visitor gets a redirect rather
 * than an error page. It is not what protects the data — `/api/catalog` is
 * behind `requireAuth` and would 401 regardless — it is what makes the bounce
 * land somewhere useful.
 *
 * `searchParams` is a Promise in Next 16.
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /**
   * The same schema the API validates against, but `safeParse` — a page and an
   * API want different things from a bad query string.
   *
   * `?page=0` and `?page=abc` are rejections, not defaults, because the schema
   * says `.min(1)` and coercion of "abc" gives `NaN`. Answering an API call
   * with 422 is right; answering a *navigation* by throwing means a typo in the
   * address bar renders a 500, which is what this did until it was measured.
   * A person who mangles a URL should get the catalog, not a crash.
   */
  const parsed = browseQuerySchema.safeParse(firstValues(await searchParams));
  const query = parsed.success ? parsed.data : browseQuerySchema.parse({});

  // The page number is carried through the login wall, so someone deep-linked
  // to page three comes back to page three. Rebuilt from the *validated* value
  // rather than the raw query, which keeps arbitrary parameters out of a
  // redirect target.
  await requireUser(query.page > 1 ? `/browse?page=${query.page}` : "/browse");

  const { listings, total } = await fetchPublishedListings(query);

  return (
    <BrowseScreen
      listings={listings}
      total={total}
      page={query.page}
      pageSize={query.pageSize}
    />
  );
}

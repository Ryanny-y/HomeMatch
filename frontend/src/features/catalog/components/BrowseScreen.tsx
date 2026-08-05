import Link from "next/link";
import { PiHouseLine } from "react-icons/pi";
import type { CatalogListingDto } from "@homematch/shared";
import { Container } from "@/components/ui/Section";
import { ListingCard } from "@/features/catalog/components/ListingCard";

/**
 * The catalog page.
 *
 * The count in the subheading is a real `COUNT(*)`, and it is written to read
 * honestly at four listings as well as at four hundred — "Four listings" rather
 * than "Thousands of homes". A catalog this size is what a hand-verified
 * catalog looks like early, and overstating it would undercut the one claim the
 * page exists to make.
 */

/** The first row gets eager images; below the fold, lazy is correct. */
const EAGER_CARDS = 3;

export function BrowseScreen({
  listings,
  total,
  page,
  pageSize,
}: {
  listings: CatalogListingDto[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main id="main" className="bg-canvas py-12 sm:py-16">
      <Container>
        <header className="max-w-2xl">
          <h1 className="text-[clamp(1.75rem,3.4vw,2.5rem)]">
            Apartments in Quezon City
          </h1>
          <p className="mt-3 text-lg leading-[1.6] text-ink-muted">
            {total === 1 ? "One listing" : `${total} listings`}. Every one checked by a
            person, with its real monthly cost worked out before it went live.
          </p>
        </header>

        {listings.length === 0 ? (
          // An empty page and an empty catalog are different facts. `?page=9`
          // against four listings returns no rows, and saying "nothing is
          // published yet" there would be a lie the reader can disprove by
          // clicking back.
          total > 0 ? <PastTheEnd /> : <EmptyCatalog />
        ) : (
          <>
            <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing, index) => (
                <li key={listing.id} className="min-w-0">
                  <ListingCard listing={listing} priority={index < EAGER_CARDS} />
                </li>
              ))}
            </ul>

            {lastPage > 1 ? (
              <Pager page={page} lastPage={lastPage} />
            ) : null}
          </>
        )}
      </Container>
    </main>
  );
}

/**
 * Not "no results" — there are no filters on this page, so an empty catalog can
 * only mean nothing is published yet. Saying that plainly beats a shrug.
 */
function EmptyCatalog() {
  return (
    <div className="mt-10 rounded-card bg-surface px-6 py-14 text-center shadow-card">
      <PiHouseLine aria-hidden className="mx-auto h-9 w-9 text-ink-faint" />
      <h2 className="mt-4 text-xl">Nothing is published yet</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">
        Listings appear here once they have been checked and their cost fields filled
        in. Create an account and we&rsquo;ll tell you when the first ones land.
      </p>
      <Link
        href="/signup?role=renter"
        className="mt-6 inline-block rounded-chip bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors duration-(--dur-state) ease-(--ease-state) hover:bg-brand-dark"
      >
        Create an account
      </Link>
    </div>
  );
}

function PastTheEnd() {
  return (
    <div className="mt-10 rounded-card bg-surface px-6 py-14 text-center shadow-card">
      <PiHouseLine aria-hidden className="mx-auto h-9 w-9 text-ink-faint" />
      <h2 className="mt-4 text-xl">There&rsquo;s nothing on this page</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">
        You&rsquo;ve gone past the end of the catalog.
      </p>
      <Link
        href="/browse"
        className="mt-6 inline-block rounded-chip bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors duration-(--dur-state) ease-(--ease-state) hover:bg-brand-dark"
      >
        Back to the first page
      </Link>
    </div>
  );
}

function Pager({ page, lastPage }: { page: number; lastPage: number }) {
  const link =
    "rounded-chip border border-line-strong px-4 py-2 text-sm font-semibold text-ink-soft transition-colors duration-(--dur-state) ease-(--ease-state) hover:border-brand hover:text-brand";

  return (
    <nav aria-label="Catalog pages" className="mt-10 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={`/browse?page=${page - 1}`} className={link} rel="prev">
          Previous
        </Link>
      ) : null}

      <p data-figure className="text-sm text-ink-muted">
        Page {page} of {lastPage}
      </p>

      {page < lastPage ? (
        <Link href={`/browse?page=${page + 1}`} className={link} rel="next">
          Next
        </Link>
      ) : null}
    </nav>
  );
}

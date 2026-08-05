import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ERROR_CODES, type CatalogListingDto } from "@homematch/shared";

import { fetchListingBySlug, ListingDetail, costOf, placeOf } from "@/features/catalog";
import { ApiError } from "@/lib/api";
import { peso } from "@/lib/format";
import { requireUser } from "@/lib/session";

/**
 * A published listing, for signed-in users.
 *
 * The API answers 404 for a draft, an archived listing and a slug that was
 * never minted alike, so all three land on the same not-found page — which is
 * the point: distinguishing them would let anyone enumerate what landlords are
 * still working on.
 */
async function loadListing(slug: string): Promise<CatalogListingDto> {
  try {
    return await fetchListingBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === ERROR_CODES.NOT_FOUND) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let listing: CatalogListingDto;

  try {
    listing = await fetchListingBySlug(slug);
  } catch {
    // The page itself will 404 in a moment; metadata should not be the thing
    // that throws first and turns that into a 500.
    return { title: "Listing not found" };
  }

  const cost = costOf(listing);
  const description = `${peso(cost.total)} a month in ${placeOf(listing)} — the true cost, not just the ${peso(cost.rent)} rent.`;

  return {
    title: listing.title,
    description,
    alternates: { canonical: `/listings/${listing.slug}` },
    // Behind the login wall, so a crawler following this URL is redirected and
    // would index the login page. The OpenGraph block below is kept anyway: it
    // costs nothing, and it is correct again the day anything is ungated.
    // Accepted consequence — pasted listing links no longer unfurl a preview,
    // because the preview crawler is unauthenticated too.
    robots: { index: false, follow: false },
    openGraph: {
      type: "article",
      title: listing.title,
      description,
      url: `/listings/${listing.slug}`,
      images: listing.images[0] ? [{ url: listing.images[0].url }] : undefined,
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireUser(`/listings/${slug}`);

  return <ListingDetail listing={await loadListing(slug)} />;
}

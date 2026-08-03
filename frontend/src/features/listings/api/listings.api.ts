import type {
  CreateListingInput,
  GeocodeResult,
  ListingDto,
  ReadinessGap,
  UpdateListingInput,
} from "@homematch/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

/**
 * The landlord listings contract.
 *
 *   GET    /api/listings/mine
 *   POST   /api/listings                        { title, propertyType, listingType, address, rent }
 *   GET    /api/listings/:id
 *   PATCH  /api/listings/:id
 *   DELETE /api/listings/:id
 *   POST   /api/listings/:id/publish            422 with { gaps } when not ready
 *   POST   /api/listings/:id/archive
 *   POST   /api/listings/:id/images/presign     → { uploadUrl, storageKey }
 *   POST   /api/listings/:id/images             { storageKey }
 *   DELETE /api/listings/:id/images/:imageId
 *   POST   /api/listings/:id/images/:imageId/primary
 */

/** Every listing response carries what still blocks publication. */
export type Listing = ListingDto & { gaps: ReadinessGap[] };

export function fetchMyListings(): Promise<Listing[]> {
  return apiGet<{ listings: Listing[] }>("/api/listings/mine").then((d) => d.listings);
}

export function fetchListing(id: string): Promise<Listing> {
  return apiGet<{ listing: Listing }>(`/api/listings/${id}`).then((d) => d.listing);
}

export function createListing(input: CreateListingInput): Promise<Listing> {
  return apiPost<{ listing: Listing }>("/api/listings", input).then((d) => d.listing);
}

export function updateListing(
  id: string,
  input: UpdateListingInput,
): Promise<Listing> {
  return apiPatch<{ listing: Listing }>(`/api/listings/${id}`, input).then((d) => d.listing);
}

export function publishListing(id: string): Promise<Listing> {
  return apiPost<{ listing: Listing }>(`/api/listings/${id}/publish`, {}).then(
    (d) => d.listing,
  );
}

export function archiveListing(id: string): Promise<Listing> {
  return apiPost<{ listing: Listing }>(`/api/listings/${id}/archive`, {}).then(
    (d) => d.listing,
  );
}

export function deleteListing(id: string): Promise<void> {
  return apiDelete<void>(`/api/listings/${id}`);
}

/**
 * Two steps by design: the browser PUTs the bytes straight to storage, then
 * tells the API the object landed. Photos from a phone camera are several
 * megabytes and have no business passing through a request worker.
 */
export async function uploadListingImage(id: string, file: File): Promise<Listing> {
  const { uploadUrl, storageKey } = await apiPost<{
    uploadUrl: string;
    storageKey: string;
  }>(`/api/listings/${id}/images/presign`, { contentType: file.type });

  const upload = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!upload.ok) {
    throw new Error("That photo didn't upload. Check your connection and try again.");
  }

  return apiPost<{ listing: Listing }>(`/api/listings/${id}/images`, { storageKey }).then(
    (d) => d.listing,
  );
}

export function deleteListingImage(id: string, imageId: string): Promise<Listing> {
  return apiDelete<{ listing: Listing }>(`/api/listings/${id}/images/${imageId}`).then(
    (d) => d.listing,
  );
}

export function makeImagePrimary(id: string, imageId: string): Promise<Listing> {
  return apiPost<{ listing: Listing }>(
    `/api/listings/${id}/images/${imageId}/primary`,
    {},
  ).then((d) => d.listing);
}

/**
 * Address → coordinates, via the API rather than Mapbox directly. The token is
 * billed per call and stays server-side; see backend/src/features/geocoding.
 */
export function geocodeAddress(query: string): Promise<GeocodeResult> {
  return apiGet<{ result: GeocodeResult }>(
    `/api/geocode?q=${encodeURIComponent(query)}`,
  ).then((d) => d.result);
}

export const listingKeys = {
  all: ["listings"] as const,
  mine: () => [...listingKeys.all, "mine"] as const,
  detail: (id: string) => [...listingKeys.all, "detail", id] as const,
};

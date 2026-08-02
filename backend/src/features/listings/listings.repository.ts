import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * Every Prisma call for listings.
 *
 * `include: { images }` rather than a bare row: a listing is never useful
 * without its photos, and a second round trip per listing on a dashboard list
 * is the classic N+1.
 */
const LISTING_INCLUDE = {
  images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
} as const satisfies Prisma.ListingInclude;

export type ListingRow = Prisma.ListingGetPayload<{ include: typeof LISTING_INCLUDE }>;

export function findListingsByOwner(ownerId: string): Promise<ListingRow[]> {
  return prisma.listing.findMany({
    where: { ownerId },
    include: LISTING_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });
}

export function findListingById(id: string): Promise<ListingRow | null> {
  return prisma.listing.findUnique({ where: { id }, include: LISTING_INCLUDE });
}

export function createListing(data: Prisma.ListingUncheckedCreateInput): Promise<ListingRow> {
  return prisma.listing.create({ data, include: LISTING_INCLUDE });
}

export function updateListing(
  id: string,
  data: Prisma.ListingUncheckedUpdateInput,
): Promise<ListingRow> {
  return prisma.listing.update({ where: { id }, data, include: LISTING_INCLUDE });
}

export function deleteListing(id: string): Promise<unknown> {
  return prisma.listing.delete({ where: { id }, select: { id: true } });
}

export function slugExists(slug: string): Promise<boolean> {
  return prisma.listing
    .findUnique({ where: { slug }, select: { id: true } })
    .then((row) => row !== null);
}

// ------------------------------------------------------------------ images ---

export function addImage(input: {
  listingId: string;
  storageKey: string;
  isPrimary: boolean;
  order: number;
}): Promise<unknown> {
  return prisma.listingImage.create({ data: input, select: { id: true } });
}

export function findImage(
  imageId: string,
): Promise<{ id: string; listingId: string; storageKey: string; isPrimary: boolean } | null> {
  return prisma.listingImage.findUnique({
    where: { id: imageId },
    select: { id: true, listingId: true, storageKey: true, isPrimary: true },
  });
}

export function countImages(listingId: string): Promise<number> {
  return prisma.listingImage.count({ where: { listingId } });
}

export function deleteImage(imageId: string): Promise<unknown> {
  return prisma.listingImage.delete({ where: { id: imageId }, select: { id: true } });
}

/**
 * Promote one image to primary, demoting the rest.
 *
 * One transaction because two primaries is a state the UI cannot render — it
 * picks the first and silently ignores the other.
 */
export function setPrimaryImage(listingId: string, imageId: string): Promise<unknown> {
  return prisma.$transaction([
    prisma.listingImage.updateMany({
      where: { listingId },
      data: { isPrimary: false },
    }),
    prisma.listingImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
      select: { id: true },
    }),
  ]);
}

import { randomUUID } from "node:crypto";
import type {
  CreateListingInput,
  ListingDto,
  ListingImageDto,
  ReadinessGap,
  UpdateListingInput,
} from "@homematch/shared";
import { findReadinessGaps } from "@homematch/shared";
import type { AuthContext } from "../../shared/middleware/requireAuth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/AppError";
import {
  deleteObject,
  presignListingUpload,
  publicUrlFor,
} from "../../shared/storage/s3";
import * as repo from "./listings.repository";
import type { ListingRow } from "./listings.repository";

/**
 * Listing business logic, including the ownership rule.
 *
 * `requireRole` upstream answers whether the caller is a landlord at all;
 * whether *this* listing is theirs needs the record, so it is decided here.
 */

/** Prisma returns Decimal for money columns; the wire carries plain numbers. */
function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function toNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function toImageDto(image: ListingRow["images"][number]): ListingImageDto {
  return {
    id: image.id,
    url: publicUrlFor(image.storageKey),
    isPrimary: image.isPrimary,
    order: image.order,
  };
}

function toDto(row: ListingRow): ListingDto {
  return {
    id: row.id,
    slug: row.slug,
    ownerId: row.ownerId,
    status: row.status,
    title: row.title,
    description: row.description,
    propertyType: row.propertyType,
    listingType: row.listingType,

    address: row.address,
    barangay: row.barangay,
    city: row.city,
    province: row.province,
    lat: row.lat,
    lng: row.lng,
    geocodePrecision: row.geocodePrecision,

    walkabilityNote: row.walkabilityNote,

    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    bedsPerRoom: row.bedsPerRoom,
    bathroomAccess: row.bathroomAccess,
    floorLevel: row.floorLevel,
    totalFloors: row.totalFloors,

    rent: toNumber(row.rent),
    depositMonths: row.depositMonths,
    advanceMonths: row.advanceMonths,
    utilitiesIncluded: row.utilitiesIncluded,
    otherFees: toNullableNumber(row.otherFees),
    parkingAvailable: row.parkingAvailable,
    parkingCost: toNullableNumber(row.parkingCost),

    petsAllowed: row.petsAllowed,
    curfew: row.curfew,
    genderPolicy: row.genderPolicy,

    images: row.images.map(toImageDto),

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function gapsFor(row: ListingRow): ReadinessGap[] {
  return findReadinessGaps({
    listingType: row.listingType,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    barangay: row.barangay,
    rent: toNumber(row.rent),
    imageCount: row.images.length,
  });
}

export type ListingWithReadiness = ListingDto & { gaps: ReadinessGap[] };

function withReadiness(row: ListingRow): ListingWithReadiness {
  return { ...toDto(row), gaps: gapsFor(row) };
}

/**
 * Loads a listing the actor is allowed to touch.
 *
 * A listing owned by someone else returns 404 rather than 403: telling a
 * stranger that an id exists but is not theirs leaks the catalog's shape. Admin
 * bypasses ownership entirely.
 */
async function loadOwned(id: string, actor: AuthContext): Promise<ListingRow> {
  const row = await repo.findListingById(id);

  if (!row) throw new NotFoundError("That listing doesn't exist.");
  if (actor.role === "admin") return row;
  if (row.ownerId !== actor.userId) throw new NotFoundError("That listing doesn't exist.");

  return row;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slug collisions are likely — "studio-in-cubao" is not a rare title. */
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "listing";

  if (!(await repo.slugExists(base))) return base;

  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function listMine(actor: AuthContext): Promise<ListingWithReadiness[]> {
  const rows = await repo.findListingsByOwner(actor.userId);
  return rows.map(withReadiness);
}

export async function getOne(
  id: string,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  return withReadiness(await loadOwned(id, actor));
}

export async function create(
  input: CreateListingInput,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  const row = await repo.createListing({
    ownerId: actor.userId,
    slug: await uniqueSlug(input.title),
    title: input.title,
    propertyType: input.propertyType,
    listingType: input.listingType,
    address: input.address,
    rent: input.rent,
  });

  return withReadiness(row);
}

export async function update(
  id: string,
  input: UpdateListingInput,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  await loadOwned(id, actor);

  // A confirmed pin is what every future commute figure is derived from, so the
  // moment coordinates change we record when — a stale geocode is otherwise
  // indistinguishable from a fresh one.
  const geocodedAt = input.lat !== undefined || input.lng !== undefined ? new Date() : undefined;

  return withReadiness(await repo.updateListing(id, { ...input, geocodedAt }));
}

export async function publish(
  id: string,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  const row = await loadOwned(id, actor);
  const gaps = gapsFor(row);

  if (gaps.length > 0) {
    // The gaps travel in `details` so the dashboard can point at the fields
    // rather than making the landlord hunt for them.
    throw new ValidationError("This listing isn't ready for renters yet.", { gaps });
  }

  return withReadiness(
    await repo.updateListing(id, { status: "published", publishedAt: new Date() }),
  );
}

export async function archive(
  id: string,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  await loadOwned(id, actor);
  return withReadiness(await repo.updateListing(id, { status: "archived" }));
}

export async function remove(id: string, actor: AuthContext): Promise<void> {
  const row = await loadOwned(id, actor);

  await repo.deleteListing(id);

  // Rows are gone either way; a failed object delete leaves storage litter, not
  // a broken listing.
  await Promise.allSettled(row.images.map((image) => deleteObject(image.storageKey)));
}

// ------------------------------------------------------------------ images ---

const MAX_IMAGES = 12;

export async function presignImage(
  id: string,
  contentType: string,
  actor: AuthContext,
): Promise<{ uploadUrl: string; storageKey: string }> {
  await loadOwned(id, actor);

  if ((await repo.countImages(id)) >= MAX_IMAGES) {
    throw new ConflictError(`A listing can hold ${MAX_IMAGES} photos.`);
  }

  return presignListingUpload(id, contentType);
}

export async function confirmImage(
  id: string,
  storageKey: string,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  await loadOwned(id, actor);

  // The key was minted by presign for this listing. Anything else is a client
  // claiming an object it does not own.
  if (!storageKey.startsWith(`listings/${id}/`)) {
    throw new ForbiddenError("That upload doesn't belong to this listing.");
  }

  const existing = await repo.countImages(id);

  await repo.addImage({
    listingId: id,
    storageKey,
    isPrimary: existing === 0,
    order: existing,
  });

  return withReadiness(await loadOwned(id, actor));
}

export async function removeImage(
  id: string,
  imageId: string,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  await loadOwned(id, actor);

  const image = await repo.findImage(imageId);

  if (!image || image.listingId !== id) {
    throw new NotFoundError("That photo doesn't exist.");
  }

  await repo.deleteImage(imageId);
  await Promise.allSettled([deleteObject(image.storageKey)]);

  const remaining = await loadOwned(id, actor);

  // Deleting the cover leaves a listing with photos and no primary, which
  // renders as an empty thumbnail. Promote the next one.
  const first = remaining.images[0];
  if (image.isPrimary && first) {
    await repo.setPrimaryImage(id, first.id);
    return withReadiness(await loadOwned(id, actor));
  }

  return withReadiness(remaining);
}

export async function makeImagePrimary(
  id: string,
  imageId: string,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  await loadOwned(id, actor);

  const image = await repo.findImage(imageId);

  if (!image || image.listingId !== id) {
    throw new NotFoundError("That photo doesn't exist.");
  }

  await repo.setPrimaryImage(id, imageId);
  return withReadiness(await loadOwned(id, actor));
}

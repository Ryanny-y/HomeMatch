import { randomUUID } from "node:crypto";
import type {
  BrowseQuery,
  CostInput,
  CreateListingInput,
  ListingDto,
  ListingImageDto,
  CatalogListingDto,
  ReadinessGap,
  UpdateListingInput,
} from "@homematch/shared";
import {
  computeTrueMonthlyCost,
  findReadinessGaps,
  totalMonthlyCost,
} from "@homematch/shared";
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

/**
 * The stored true-cost figure, from whichever values the row will hold *after*
 * the write in hand.
 *
 * Routed through the same shared `computeTrueMonthlyCost` the cards and the
 * detail page render with, so the column a renter filters on and the number
 * they read cannot drift apart. **This is the only place that writes it** —
 * anything else setting the column directly reintroduces exactly the
 * disagreement the column exists to prevent.
 */
function trueMonthlyCostOf(input: CostInput): number {
  return totalMonthlyCost(computeTrueMonthlyCost(input));
}

/**
 * The cost inputs a patch leaves behind, merged over what is already stored.
 *
 * `undefined` and `null` have to be told apart here: the first means the caller
 * did not mention the field, the second means they cleared it. Collapsing them
 * would make clearing a parking charge look like leaving it alone.
 */
function costAfterUpdate(current: ListingRow, input: UpdateListingInput): CostInput {
  return {
    rent: input.rent ?? toNumber(current.rent),
    otherFees:
      input.otherFees !== undefined ? input.otherFees : toNullableNumber(current.otherFees),
    parkingAvailable: input.parkingAvailable ?? current.parkingAvailable,
    parkingCost:
      input.parkingCost !== undefined ? input.parkingCost : toNullableNumber(current.parkingCost),
  };
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
    nearTransit: row.nearTransit,

    walkabilityNote: row.walkabilityNote,

    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    bedsPerRoom: row.bedsPerRoom,
    bathroomAccess: row.bathroomAccess,
    floorLevel: row.floorLevel,
    totalFloors: row.totalFloors,
    furnished: row.furnished,
    aircon: row.aircon,

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

/**
 * Exported so the admin surface can render a listing without a second mapper.
 *
 * Money coercion, image URLs and the readiness rule all live here; a parallel
 * `toDto` in another feature would drift the moment a column is added, and the
 * two tables would start disagreeing about the same listing.
 */
export function withReadiness(row: ListingRow): ListingWithReadiness {
  return { ...toDto(row), gaps: gapsFor(row) };
}

// ----------------------------------------------------------- catalog read ---

/**
 * The same listing, narrowed to what a non-owner may see.
 *
 * The catalog is behind `requireAuth`, so the reader has an account — but an
 * account is not ownership. A signed-in renter must still not receive
 * `ownerId`, which is a handle on another user, or `gaps`, which is a list of
 * what that landlord has not finished writing.
 *
 * Built by subtraction from `toDto` rather than as a second field-by-field
 * mapper: a parallel mapper would keep the private fields out today and quietly
 * let the next column through, because nothing would fail when one was added.
 * Here a new column is exposed unless it is named in this destructure, which is
 * the wrong default — so the two names below are the whole disclosure surface
 * and are meant to be read as such.
 */
function toCatalogDto(row: ListingRow): CatalogListingDto {
  const { ownerId: _ownerId, status: _status, ...visible } = toDto(row);

  return {
    ...visible,
    // Nullable on the model so drafts need no publish date. A row reaching here
    // came from a `status: "published"` query, so the fallback is unreachable in
    // practice and exists to keep the DTO's date non-nullable for the UI.
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
  };
}

export async function browsePublished(
  query: BrowseQuery,
): Promise<{ listings: CatalogListingDto[]; total: number }> {
  const [rows, total] = await Promise.all([
    repo.findPublishedListings((query.page - 1) * query.pageSize, query.pageSize),
    repo.countPublished(),
  ]);

  return { listings: rows.map(toCatalogDto), total };
}

export async function getPublishedBySlug(slug: string): Promise<CatalogListingDto> {
  const row = await repo.findPublishedBySlug(slug);

  // A draft's slug and a slug that was never minted both answer "no such
  // listing". Distinguishing them would let anyone enumerate what a landlord is
  // still working on.
  if (!row) throw new NotFoundError("That listing doesn't exist.");

  return toCatalogDto(row);
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
    // A new listing carries no fees and no parking yet, so this is the rent —
    // but it goes through the same function anyway rather than being assigned
    // `input.rent`, so the column has exactly one definition.
    trueMonthlyCost: trueMonthlyCostOf({
      rent: input.rent,
      otherFees: null,
      parkingAvailable: false,
      parkingCost: null,
    }),
  });

  return withReadiness(row);
}

export async function update(
  id: string,
  input: UpdateListingInput,
  actor: AuthContext,
): Promise<ListingWithReadiness> {
  const current = await loadOwned(id, actor);

  // A confirmed pin is what every future commute figure is derived from, so the
  // moment coordinates change we record when — a stale geocode is otherwise
  // indistinguishable from a fresh one.
  const geocodedAt = input.lat !== undefined || input.lng !== undefined ? new Date() : undefined;

  // Recomputed on every update, not only when a cost field appears in the
  // patch. The saving from checking is one multiplication, and the cost of
  // getting the check subtly wrong is a stored figure that quietly disagrees
  // with the one on the card.
  const trueMonthlyCost = trueMonthlyCostOf(costAfterUpdate(current, input));

  return withReadiness(
    await repo.updateListing(id, { ...input, geocodedAt, trueMonthlyCost }),
  );
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

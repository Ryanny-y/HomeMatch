import type { AdminListingQuery, AdminUserQuery, Role } from "@homematch/shared";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * Every Prisma call the admin surface makes.
 *
 * Deliberately its own file rather than reaching into `listings.repository`:
 * that one is scoped by owner on purpose, and an unscoped `findMany` living
 * next to it would be one autocomplete away from leaking the whole catalog into
 * a landlord's dashboard.
 */

/**
 * Wider than auth's `USER_DTO_SELECT`, which is deliberately narrow enough for
 * a session response. A separate constant rather than widening that one — the
 * session payload has no business carrying a listing count.
 */
const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  _count: { select: { listings: true } },
} as const satisfies Prisma.UserSelect;

export type AdminUserRow = Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>;

/**
 * Mirrors `listings.repository`'s image ordering so a listing looks the same
 * here as it does in the landlord's editor, and adds the owner — the column
 * that makes an all-owners table readable.
 */
const ADMIN_LISTING_INCLUDE = {
  images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
  owner: { select: { id: true, email: true, fullName: true } },
} as const satisfies Prisma.ListingInclude;

export type AdminListingRow = Prisma.ListingGetPayload<{
  include: typeof ADMIN_LISTING_INCLUDE;
}>;

// ------------------------------------------------------------------ users ---

function userWhere(query: AdminUserQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (query.role) where.role = query.role;
  if (query.verified !== undefined) where.emailVerified = query.verified;

  if (query.q) {
    where.OR = [
      { email: { contains: query.q, mode: "insensitive" } },
      { fullName: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export function findUsers(query: AdminUserQuery): Promise<AdminUserRow[]> {
  return prisma.user.findMany({
    where: userWhere(query),
    select: ADMIN_USER_SELECT,
    orderBy: { [query.sort]: query.direction },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
}

export function countUsers(query: AdminUserQuery): Promise<number> {
  return prisma.user.count({ where: userWhere(query) });
}

export function findUserById(id: string): Promise<AdminUserRow | null> {
  return prisma.user.findUnique({ where: { id }, select: ADMIN_USER_SELECT });
}

/**
 * Role change and session revocation in one transaction.
 *
 * A demoted user holding a live access token keeps their old `role` claim until
 * it expires, so the refresh families go with the change — otherwise the
 * demotion is advisory for up to the access-token TTL.
 */
export function updateUserRole(id: string, role: Role): Promise<AdminUserRow> {
  return prisma
    .$transaction([
      prisma.user.update({ where: { id }, data: { role }, select: ADMIN_USER_SELECT }),
      prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ])
    .then(([user]) => user);
}

export function deleteUser(id: string): Promise<unknown> {
  return prisma.user.delete({ where: { id }, select: { id: true } });
}

/** Storage keys for a user's photos, read before the cascade removes the rows. */
export function findStorageKeysForOwner(ownerId: string): Promise<{ storageKey: string }[]> {
  return prisma.listingImage.findMany({
    where: { listing: { ownerId } },
    select: { storageKey: true },
  });
}

// --------------------------------------------------------------- listings ---

function listingWhere(query: AdminListingQuery): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.propertyType) where.propertyType = query.propertyType;
  if (query.ownerId) where.ownerId = query.ownerId;
  if (query.barangay) where.barangay = { equals: query.barangay, mode: "insensitive" };

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { address: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export function findListings(query: AdminListingQuery): Promise<AdminListingRow[]> {
  return prisma.listing.findMany({
    where: listingWhere(query),
    include: ADMIN_LISTING_INCLUDE,
    orderBy: { [query.sort]: query.direction },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
}

export function countListings(query: AdminListingQuery): Promise<number> {
  return prisma.listing.count({ where: listingWhere(query) });
}

/** The distinct barangays in use, so the filter offers real values only. */
export function findBarangays(): Promise<{ barangay: string | null }[]> {
  return prisma.listing.findMany({
    where: { barangay: { not: null } },
    distinct: ["barangay"],
    select: { barangay: true },
    orderBy: { barangay: "asc" },
  });
}

// --------------------------------------------------------------- overview ---

export function countAllUsers(): Promise<number> {
  return prisma.user.count();
}

/**
 * Mapped rather than returned straight through: a declared return type
 * contextually types `groupBy`'s argument and breaks its overload resolution,
 * and `count` reads better than Prisma's `_count` at the call site.
 */
export async function countUsersByRole(): Promise<{ role: Role; count: number }[]> {
  const groups = await prisma.user.groupBy({ by: ["role"], _count: true });

  return groups.map((group) => ({ role: group.role, count: group._count }));
}

export function countVerifiedUsers(): Promise<number> {
  return prisma.user.count({ where: { emailVerified: true } });
}

export function countUsersSince(since: Date): Promise<number> {
  return prisma.user.count({ where: { createdAt: { gte: since } } });
}

export function countAllListings(): Promise<number> {
  return prisma.listing.count();
}

export async function countListingsByStatus(): Promise<
  { status: AdminListingRow["status"]; count: number }[]
> {
  const groups = await prisma.listing.groupBy({ by: ["status"], _count: true });

  return groups.map((group) => ({ status: group.status, count: group._count }));
}

export function countListingsSince(since: Date): Promise<number> {
  return prisma.listing.count({ where: { createdAt: { gte: since } } });
}

export function aggregatePublishedRent(): Promise<{
  _avg: { rent: Prisma.Decimal | null };
  _min: { rent: Prisma.Decimal | null };
  _max: { rent: Prisma.Decimal | null };
}> {
  return prisma.listing.aggregate({
    where: { status: "published" },
    _avg: { rent: true },
    _min: { rent: true },
    _max: { rent: true },
  });
}

export type ReadinessRow = {
  listingType: AdminListingRow["listingType"];
  description: string | null;
  lat: number | null;
  lng: number | null;
  barangay: string | null;
  rent: Prisma.Decimal;
  _count: { images: number };
};

/**
 * Only the columns `findReadinessGaps` reads.
 *
 * Gaps are computed in JavaScript from a shared rule, so they cannot be counted
 * in SQL — the rows have to come back and be run through it. Fine while the
 * catalog is hand-seeded; at thousands of drafts this wants a denormalised
 * `readyAt` column rather than a bigger query.
 */
export function findDraftsForReadiness(): Promise<ReadinessRow[]> {
  return prisma.listing.findMany({
    where: { status: "draft" },
    select: {
      listingType: true,
      description: true,
      lat: true,
      lng: true,
      barangay: true,
      rent: true,
      _count: { select: { images: true } },
    },
  });
}

export function findUserSignupDates(since: Date): Promise<{ createdAt: Date }[]> {
  return prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export function findListingCreatedDates(since: Date): Promise<{ createdAt: Date }[]> {
  return prisma.listing.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

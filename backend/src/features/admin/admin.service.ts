import type {
  AdminListingDto,
  AdminListingQuery,
  AdminOverviewDto,
  AdminUserDto,
  AdminUserQuery,
  DailyCount,
  ListingStatus,
  Role,
  UserRole,
} from "@homematch/shared";
import { ACTIVITY_WINDOW_DAYS, findReadinessGaps } from "@homematch/shared";
import type { AuthContext } from "../../shared/middleware/requireAuth";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { deleteObject } from "../../shared/storage/s3";
import * as authService from "../auth/auth.service";
import { withReadiness } from "../listings/listings.service";
import * as repo from "./admin.repository";
import type { AdminListingRow, AdminUserRow } from "./admin.repository";

/**
 * Admin business logic.
 *
 * `requireRole("admin")` upstream answered *who* — the coarse question the
 * token alone can settle. Everything here answers *whether*: whether this
 * particular target may be touched at all.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toUserDto(row: AdminUserRow): AdminUserDto {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    emailVerified: row.emailVerified,
    listingCount: row._count.listings,
    createdAt: row.createdAt.toISOString(),
  };
}

function toListingDto(row: AdminListingRow): AdminListingDto {
  return { ...withReadiness(row), owner: row.owner };
}

/**
 * The two rules every user mutation runs first.
 *
 * Self is refused because the only admin deleting their own account takes the
 * catalog's listings with it through the cascade, and demoting yourself locks
 * the last admin out of the surface that could undo it. Another admin is
 * refused for the same reason one level out: admin is granted by the seed
 * script, so the API must not be a path to revoking it either.
 */
async function loadMutableTarget(id: string, actor: AuthContext): Promise<AdminUserRow> {
  const row = await repo.findUserById(id);

  if (!row) throw new NotFoundError("That account doesn't exist.");

  if (row.id === actor.userId) {
    throw new ForbiddenError("You can't do that to your own account.");
  }

  if (row.role === "admin") {
    throw new ForbiddenError("Admin accounts can only be changed from the server.");
  }

  return row;
}

// ------------------------------------------------------------------ users ---

export async function listUsers(
  query: AdminUserQuery,
): Promise<{ users: AdminUserDto[]; total: number }> {
  const [rows, total] = await Promise.all([repo.findUsers(query), repo.countUsers(query)]);

  return { users: rows.map(toUserDto), total };
}

export async function changeRole(
  id: string,
  role: UserRole,
  actor: AuthContext,
): Promise<AdminUserDto> {
  await loadMutableTarget(id, actor);

  return toUserDto(await repo.updateUserRole(id, role));
}

/**
 * Re-sends the verification email through auth's own service.
 *
 * That service takes an email and resolves silently for an unknown or
 * already-verified account, because it is reachable unauthenticated and must
 * not become an account-existence oracle. Here the account is already known to
 * exist, so the caller gets the row's state back and the UI can say which of
 * the two happened.
 */
export async function resendVerification(
  id: string,
  actor: AuthContext,
): Promise<{ sent: boolean }> {
  const target = await loadMutableTarget(id, actor);

  if (target.emailVerified) return { sent: false };

  await authService.resendVerification(target.email);

  return { sent: true };
}

export async function signOutEverywhere(
  id: string,
  actor: AuthContext,
): Promise<{ sessionsRevoked: number }> {
  await loadMutableTarget(id, actor);

  const { count } = await authService.revokeSessionsFor(id);

  return { sessionsRevoked: count };
}

/**
 * Hard delete. Every relation cascades — listings, images, preferences, tokens.
 *
 * The photo objects do not: S3 knows nothing about the foreign keys, so the
 * storage keys are read before the rows go and the objects are swept after.
 * A failed sweep leaves storage litter, not a broken account.
 */
export async function removeUser(id: string, actor: AuthContext): Promise<void> {
  await loadMutableTarget(id, actor);

  const keys = await repo.findStorageKeysForOwner(id);

  await repo.deleteUser(id);

  await Promise.allSettled(keys.map(({ storageKey }) => deleteObject(storageKey)));
}

// --------------------------------------------------------------- listings ---

export async function listListings(
  query: AdminListingQuery,
): Promise<{ listings: AdminListingDto[]; total: number }> {
  const [rows, total] = await Promise.all([
    repo.findListings(query),
    repo.countListings(query),
  ]);

  return { listings: rows.map(toListingDto), total };
}

export async function listBarangays(): Promise<string[]> {
  const rows = await repo.findBarangays();

  return rows
    .map((row) => row.barangay)
    .filter((barangay): barangay is string => barangay !== null);
}

// --------------------------------------------------------------- overview ---

/**
 * Calendar days in Manila, not UTC.
 *
 * Quezon City is UTC+8, so bucketing on the ISO timestamp would file anything
 * before 8am local under the previous day — a chart that disagrees with the
 * date every reader is standing in. `en-CA` formats as `YYYY-MM-DD`, which is
 * the shape the DTO promises.
 */
const manilaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function bucketByDay(rows: { createdAt: Date }[], since: Date): DailyCount[] {
  const counts = new Map<string, number>();

  for (let offset = 0; offset < ACTIVITY_WINDOW_DAYS; offset += 1) {
    counts.set(manilaDate.format(new Date(since.getTime() + offset * DAY_MS)), 0);
  }

  for (const row of rows) {
    const key = manilaDate.format(row.createdAt);
    const current = counts.get(key);

    if (current !== undefined) counts.set(key, current + 1);
  }

  return [...counts].map(([date, count]) => ({ date, count }));
}

export async function overview(): Promise<AdminOverviewDto> {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS);
  const windowStart = new Date(now - (ACTIVITY_WINDOW_DAYS - 1) * DAY_MS);

  const [
    totalUsers,
    usersByRole,
    verified,
    newUsers,
    totalListings,
    listingsByStatus,
    newListings,
    rent,
    drafts,
    signupDates,
    listingDates,
  ] = await Promise.all([
    repo.countAllUsers(),
    repo.countUsersByRole(),
    repo.countVerifiedUsers(),
    repo.countUsersSince(sevenDaysAgo),
    repo.countAllListings(),
    repo.countListingsByStatus(),
    repo.countListingsSince(sevenDaysAgo),
    repo.aggregatePublishedRent(),
    repo.findDraftsForReadiness(),
    repo.findUserSignupDates(windowStart),
    repo.findListingCreatedDates(windowStart),
  ]);

  // Seeded with every key so a role or status nobody holds reports 0 rather
  // than going missing — `groupBy` only returns groups that exist.
  const byRole: Record<Role, number> = { renter: 0, landlord: 0, admin: 0 };
  for (const group of usersByRole) byRole[group.role] += group.count;

  const byStatus: Record<ListingStatus, number> = {
    draft: 0,
    published: 0,
    archived: 0,
  };
  for (const group of listingsByStatus) byStatus[group.status] += group.count;

  const blockedByGaps = drafts.filter(
    (draft) =>
      findReadinessGaps({
        listingType: draft.listingType,
        description: draft.description,
        lat: draft.lat,
        lng: draft.lng,
        barangay: draft.barangay,
        rent: Number(draft.rent),
        imageCount: draft._count.images,
      }).length > 0,
  ).length;

  return {
    users: {
      total: totalUsers,
      byRole,
      verified,
      unverified: totalUsers - verified,
      newLast7Days: newUsers,
    },
    listings: {
      total: totalListings,
      byStatus,
      blockedByGaps,
      newLast7Days: newListings,
    },
    publishedRent:
      rent._avg.rent === null || rent._min.rent === null || rent._max.rent === null
        ? null
        : {
            average: Number(rent._avg.rent),
            min: Number(rent._min.rent),
            max: Number(rent._max.rent),
          },
    signupsByDay: bucketByDay(signupDates, windowStart),
    listingsByDay: bucketByDay(listingDates, windowStart),
  };
}

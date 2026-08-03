import { z } from "zod";
import { roleSchema, userRoleSchema, type Role } from "./auth";
import {
  listingStatusSchema,
  propertyTypeSchema,
  type ListingDto,
  type ListingStatus,
  type ReadinessGap,
} from "./listing";

/**
 * The admin contract — the only surface that reads across every owner.
 *
 * Layout, copy and states for the screens these drive are specified in
 * `docs/design/admin-surface.md`.
 *
 * Two rules hold everything here together:
 *
 * 1. **Every figure is a count over rows that exist.** There is no event
 *    tracking, no aggregation job and no audit log, so nothing in
 *    `AdminOverviewDto` can describe views, saves, interest or conversion.
 *    Inventing traction on a product whose whole claim is that its numbers can
 *    be checked is the worst possible place to start.
 * 2. **`admin` is never a value the API accepts.** Role changes reuse
 *    `userRoleSchema`, which excludes it, so the one path that mints an admin
 *    stays the seed script.
 */

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;
export const SEARCH_MAX_LENGTH = 120;

/**
 * Query strings arrive as strings, so paging coerces.
 *
 * `pageSize` is capped rather than trusted: an uncapped page size is a
 * one-parameter way to ask the database for the entire table.
 */
const pageField = z.coerce.number().int().min(1).default(1);
const pageSizeField = z.coerce
  .number()
  .int()
  .min(1)
  .max(PAGE_SIZE_MAX)
  .default(PAGE_SIZE_DEFAULT);

/** An absent filter and a cleared one arrive differently; both mean "no filter". */
const searchField = z
  .string()
  .trim()
  .max(SEARCH_MAX_LENGTH)
  .optional()
  .transform((value) => (value ? value : undefined));

/**
 * `?verified=true`, not `?verified`.
 *
 * Written out rather than coerced because `Boolean("false")` is `true`, which
 * would silently invert the filter.
 */
const flagField = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === "true"));

export const sortDirectionSchema = z.enum(["asc", "desc"]);

export const adminUserSortSchema = z.enum(["createdAt", "email", "role"]);
export const adminListingSortSchema = z.enum(["createdAt", "updatedAt", "rent", "title"]);

export const adminUserQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  role: roleSchema.optional(),
  verified: flagField,
  q: searchField,
  sort: adminUserSortSchema.default("createdAt"),
  direction: sortDirectionSchema.default("desc"),
});

export const adminListingQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  status: listingStatusSchema.optional(),
  propertyType: propertyTypeSchema.optional(),
  ownerId: z.uuid().optional(),
  barangay: searchField,
  q: searchField,
  sort: adminListingSortSchema.default("createdAt"),
  direction: sortDirectionSchema.default("desc"),
});

export const userIdParamSchema = z.object({ id: z.uuid() });

/**
 * Reuses `userRoleSchema` rather than restating the pair.
 *
 * That schema exists to stop signup minting an admin; the same reason applies
 * here, and a second enum listing the same two values is a second place for the
 * rule to drift.
 */
export const updateUserRoleSchema = z.object({ role: userRoleSchema });

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type AdminListingQuery = z.infer<typeof adminListingQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type AdminUserSort = z.infer<typeof adminUserSortSchema>;
export type AdminListingSort = z.infer<typeof adminListingSortSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;

export type AdminUserDto = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  emailVerified: boolean;
  listingCount: number;
  createdAt: string;
};

/**
 * A listing plus who owns it.
 *
 * `owner` is the whole reason this differs from `ListingDto`: every other
 * listing surface is already scoped to one landlord, so the name would be noise.
 * Here it is the column that makes the table readable.
 */
export type AdminListingDto = ListingDto & {
  owner: { id: string; email: string; fullName: string };
  gaps: ReadinessGap[];
};

/** One bar. `date` is an ISO calendar date (`YYYY-MM-DD`), not a timestamp. */
export type DailyCount = {
  date: string;
  count: number;
};

export type AdminOverviewDto = {
  users: {
    total: number;
    byRole: Record<Role, number>;
    verified: number;
    unverified: number;
    newLast7Days: number;
  };
  listings: {
    total: number;
    byStatus: Record<ListingStatus, number>;
    /** Drafts that `findReadinessGaps` still blocks from publication. */
    blockedByGaps: number;
    newLast7Days: number;
  };
  /**
   * Published rent only, and null until something is published — an average
   * that silently included drafts and archived units would describe a market
   * that nobody can rent.
   */
  publishedRent: { average: number; min: number; max: number } | null;
  signupsByDay: DailyCount[];
  listingsByDay: DailyCount[];
};

/** How many days of history the overview series carry. */
export const ACTIVITY_WINDOW_DAYS = 30;

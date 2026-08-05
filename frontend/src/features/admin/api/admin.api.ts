import type {
  AdminListingDto,
  AdminListingQuery,
  AdminOverviewDto,
  AdminUserDto,
  AdminUserQuery,
  UserRole,
} from "@homematch/shared";
import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, withQuery } from "@/lib/api";

/**
 * The admin contract.
 *
 *   GET    /api/admin/overview                      counts over rows that exist
 *   GET    /api/admin/users                         paginated + filtered
 *   PATCH  /api/admin/users/:id/role                renter ↔ landlord
 *   POST   /api/admin/users/:id/resend-verification
 *   POST   /api/admin/users/:id/sign-out            revokes refresh families
 *   DELETE /api/admin/users/:id                     cascades
 *   GET    /api/admin/listings                      every owner
 *
 * Listing *mutations* are deliberately absent — an admin publishes, archives and
 * deletes through `/api/listings/:id` like a landlord does, because the service
 * behind it already returns any row to an admin. Those live in
 * `features/listings` and are imported from its hooks rather than restated here.
 */

export type PaginatedResult<T> = {
  rows: T[];
  total: number;
};

export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
  users: (query: AdminUserQuery) => [...adminKeys.all, "users", query] as const,
  listings: (query: AdminListingQuery) => [...adminKeys.all, "listings", query] as const,
  barangays: () => [...adminKeys.all, "barangays"] as const,
};

export function fetchOverview(): Promise<AdminOverviewDto> {
  return apiGet<{ overview: AdminOverviewDto }>("/api/admin/overview").then(
    (data) => data.overview,
  );
}

export async function fetchUsers(
  query: AdminUserQuery,
): Promise<PaginatedResult<AdminUserDto>> {
  const { data, meta } = await apiGetPage<{ users: AdminUserDto[] }>(
    withQuery("/api/admin/users", { ...query }),
  );

  return { rows: data.users, total: meta.total };
}

export async function fetchListings(
  query: AdminListingQuery,
): Promise<PaginatedResult<AdminListingDto>> {
  const { data, meta } = await apiGetPage<{ listings: AdminListingDto[] }>(
    withQuery("/api/admin/listings", { ...query }),
  );

  return { rows: data.listings, total: meta.total };
}

export function fetchBarangays(): Promise<string[]> {
  return apiGet<{ barangays: string[] }>("/api/admin/listings/barangays").then(
    (data) => data.barangays,
  );
}

export function changeUserRole(input: {
  id: string;
  role: UserRole;
}): Promise<AdminUserDto> {
  return apiPatch<{ user: AdminUserDto }>(`/api/admin/users/${input.id}/role`, {
    role: input.role,
  }).then((data) => data.user);
}

export function resendVerification(id: string): Promise<{ sent: boolean }> {
  return apiPost<{ sent: boolean }>(`/api/admin/users/${id}/resend-verification`, {});
}

export function signOutUser(id: string): Promise<{ sessionsRevoked: number }> {
  return apiPost<{ sessionsRevoked: number }>(`/api/admin/users/${id}/sign-out`, {});
}

export function deleteUser(id: string): Promise<void> {
  return apiDelete<void>(`/api/admin/users/${id}`);
}

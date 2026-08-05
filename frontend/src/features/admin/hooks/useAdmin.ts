"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminListingQuery, AdminUserQuery } from "@homematch/shared";
import { archiveListing, deleteListing, publishListing } from "@/features/listings";
import * as api from "@/features/admin/api/admin.api";

export function useOverview() {
  return useQuery({ queryKey: api.adminKeys.overview(), queryFn: api.fetchOverview });
}

export function useAdminUsers(query: AdminUserQuery) {
  return useQuery({
    queryKey: api.adminKeys.users(query),
    queryFn: () => api.fetchUsers(query),
    // The previous page stays on screen while the next one loads, so paging
    // does not blank the table and shift the layout under the cursor.
    placeholderData: (previous) => previous,
  });
}

export function useAdminListings(query: AdminListingQuery) {
  return useQuery({
    queryKey: api.adminKeys.listings(query),
    queryFn: () => api.fetchListings(query),
    placeholderData: (previous) => previous,
  });
}

export function useBarangays() {
  return useQuery({
    queryKey: api.adminKeys.barangays(),
    queryFn: api.fetchBarangays,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Invalidates every admin query after a write.
 *
 * Broader than the listings feature's targeted `setQueryData`, and deliberately
 * so: a role change moves a row between filtered pages and shifts the counts on
 * the overview, so there is no single cache entry to patch. The lists are small
 * and the refetch is cheap.
 */
function useAdminInvalidator() {
  const client = useQueryClient();

  return () => client.invalidateQueries({ queryKey: api.adminKeys.all });
}

export function useChangeUserRole() {
  const invalidate = useAdminInvalidator();

  return useMutation({ mutationFn: api.changeUserRole, onSuccess: invalidate });
}

export function useResendVerification() {
  return useMutation({ mutationFn: api.resendVerification });
}

export function useSignOutUser() {
  return useMutation({ mutationFn: api.signOutUser });
}

export function useDeleteUser() {
  const invalidate = useAdminInvalidator();

  return useMutation({ mutationFn: api.deleteUser, onSuccess: invalidate });
}

/**
 * Listing transitions, driven through the listings feature's own API.
 *
 * The endpoints are unchanged — an admin publishes exactly what a landlord
 * publishes, gaps and all — so only the cache owner differs.
 */
export function usePublishListing() {
  const invalidate = useAdminInvalidator();

  return useMutation({ mutationFn: publishListing, onSuccess: invalidate });
}

export function useArchiveListing() {
  const invalidate = useAdminInvalidator();

  return useMutation({ mutationFn: archiveListing, onSuccess: invalidate });
}

export function useDeleteListing() {
  const invalidate = useAdminInvalidator();

  return useMutation({ mutationFn: deleteListing, onSuccess: invalidate });
}

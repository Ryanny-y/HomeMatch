"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/features/profile/api/profile.api";

export function useProfile() {
  return useQuery({
    queryKey: api.profileKeys.mine(),
    queryFn: api.fetchProfile,
  });
}

/**
 * The save returns the whole profile, so the fresh copy is written straight
 * into the cache rather than invalidating and refetching — on mobile data a
 * save should not cost a second round trip to see.
 */
export function useSaveProfile() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (preference) => {
      client.setQueryData(api.profileKeys.mine(), preference);
    },
  });
}

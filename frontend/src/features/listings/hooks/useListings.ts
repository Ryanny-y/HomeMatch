"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateListingInput } from "@homematch/shared";
import * as api from "@/features/listings/api/listings.api";
import type { Listing } from "@/features/listings/api/listings.api";

/**
 * Every mutation here returns the whole listing, so each one writes the fresh
 * copy into both caches rather than invalidating and refetching. On mobile data
 * a saved field should not cost a second round trip to see.
 */
function useListingWriter() {
  const client = useQueryClient();

  return (listing: Listing) => {
    client.setQueryData(api.listingKeys.detail(listing.id), listing);
    client.setQueryData<Listing[]>(api.listingKeys.mine(), (current) =>
      current?.map((item) => (item.id === listing.id ? listing : item)),
    );
  };
}

export function useMyListings() {
  return useQuery({
    queryKey: api.listingKeys.mine(),
    queryFn: api.fetchMyListings,
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: api.listingKeys.detail(id),
    queryFn: () => api.fetchListing(id),
  });
}

export function useCreateListing() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: api.createListing,
    onSuccess: (listing) => {
      client.setQueryData(api.listingKeys.detail(listing.id), listing);
      void client.invalidateQueries({ queryKey: api.listingKeys.mine() });
    },
  });
}

export function useUpdateListing(id: string) {
  const write = useListingWriter();

  return useMutation({
    mutationFn: (input: UpdateListingInput) => api.updateListing(id, input),
    onSuccess: write,
  });
}

export function usePublishListing() {
  const write = useListingWriter();
  return useMutation({ mutationFn: api.publishListing, onSuccess: write });
}

export function useArchiveListing() {
  const write = useListingWriter();
  return useMutation({ mutationFn: api.archiveListing, onSuccess: write });
}

export function useDeleteListing() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: api.deleteListing,
    onSuccess: (_result, id) => {
      client.removeQueries({ queryKey: api.listingKeys.detail(id) });
      void client.invalidateQueries({ queryKey: api.listingKeys.mine() });
    },
  });
}

export function useUploadImage(id: string) {
  const write = useListingWriter();

  return useMutation({
    mutationFn: (file: File) => api.uploadListingImage(id, file),
    onSuccess: write,
  });
}

export function useDeleteImage(id: string) {
  const write = useListingWriter();

  return useMutation({
    mutationFn: (imageId: string) => api.deleteListingImage(id, imageId),
    onSuccess: write,
  });
}

export function useMakeImagePrimary(id: string) {
  const write = useListingWriter();

  return useMutation({
    mutationFn: (imageId: string) => api.makeImagePrimary(id, imageId),
    onSuccess: write,
  });
}

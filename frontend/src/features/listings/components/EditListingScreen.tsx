"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { useListing } from "@/features/listings/hooks/useListings";
import { EditListingForm } from "./EditListingForm";

/** Fetches the listing so the route stays a thin server component. */
export function EditListingScreen({ id }: { id: string }) {
  const { data: listing, isPending, isError, error } = useListing(id);

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-28 rounded-card bg-surface-sunken" />
        <div className="h-64 rounded-card bg-surface-sunken" />
        <p className="sr-only">Loading this listing.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Alert>{error.message}</Alert>
        <Link href="/landlord" className="font-semibold text-brand hover:text-brand-dark">
          Back to your units
        </Link>
      </div>
    );
  }

  return <EditListingForm listing={listing} />;
}

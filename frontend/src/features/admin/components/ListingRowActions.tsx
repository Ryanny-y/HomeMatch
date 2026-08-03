"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminListingDto } from "@homematch/shared";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import {
  useArchiveListing,
  useDeleteListing,
  usePublishListing,
} from "@/features/admin/hooks/useAdmin";

/**
 * Publish, archive, edit, delete — the same transitions a landlord has.
 *
 * Publish is disabled while readiness gaps remain, and the menu **names them**
 * rather than only refusing: the server would reject the call anyway, so the
 * useful thing a menu can add is what to go and fix.
 *
 * Editing opens the landlord editor, which already accepts an admin.
 */
export function ListingRowActions({
  listing,
  onDone,
}: {
  listing: AdminListingDto;
  onDone: (message: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const publish = usePublishListing();
  const archive = useArchiveListing();
  const remove = useDeleteListing();

  const blocked = listing.gaps.length > 0;
  const isPublished = listing.status === "published";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal aria-hidden />
            <span className="sr-only">Actions for {listing.title}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem asChild>
            <Link href={`/landlord/listings/${listing.id}/edit`}>Edit listing</Link>
          </DropdownMenuItem>

          {blocked && !isPublished ? (
            <DropdownMenuLabel className="font-normal text-ink-muted">
              Can&rsquo;t publish yet — missing{" "}
              {listing.gaps.map((gap) => gap.label.toLowerCase()).join(", ")}.
            </DropdownMenuLabel>
          ) : null}

          <DropdownMenuItem
            disabled={blocked || isPublished || publish.isPending}
            onSelect={() =>
              publish.mutate(listing.id, {
                onSuccess: () => onDone(`Published “${listing.title}”.`),
                onError: (error) => onDone(error.message),
              })
            }
          >
            {isPublished ? "Already live" : "Publish"}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={listing.status === "archived" || archive.isPending}
            onSelect={() =>
              archive.mutate(listing.id, {
                onSuccess: () => onDone(`Archived “${listing.title}”.`),
                onError: (error) => onDone(error.message),
              })
            }
          >
            {listing.status === "archived" ? "Already archived" : "Archive"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              setConfirmingDelete(true);
            }}
          >
            Delete listing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{listing.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the listing and its {listing.images.length} photo
              {listing.images.length === 1 ? "" : "s"} for good. Archiving hides it
              from renters and keeps it — prefer that unless the listing was a
              mistake.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(listing.id, {
                  onSuccess: () => onDone(`Deleted “${listing.title}”.`),
                  onError: (error) => onDone(error.message),
                })
              }
            >
              {remove.isPending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminUserDto } from "@homematch/shared";
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
  useChangeUserRole,
  useDeleteUser,
  useResendVerification,
  useSignOutUser,
} from "@/features/admin/hooks/useAdmin";

/**
 * Row actions.
 *
 * Protected rows — your own account, and any other admin — render their items
 * **disabled with the reason stated**, never hidden. A control that vanishes
 * teaches nothing; one that is visibly unavailable answers the question before
 * it is asked. The API refuses both cases regardless; this is the explanation,
 * not the enforcement.
 */
export function UserRowActions({
  user,
  currentUserId,
  onDone,
}: {
  user: AdminUserDto;
  currentUserId: string;
  onDone: (message: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const changeRole = useChangeUserRole();
  const resend = useResendVerification();
  const signOut = useSignOutUser();
  const remove = useDeleteUser();

  const isSelf = user.id === currentUserId;
  const isAdmin = user.role === "admin";
  const protectedReason = isSelf
    ? "This is your own account"
    : isAdmin
      ? "Admins are managed from the server"
      : null;

  const nextRole = user.role === "renter" ? "landlord" : "renter";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal aria-hidden />
            <span className="sr-only">Actions for {user.fullName}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {protectedReason ? (
            <>
              <DropdownMenuLabel className="font-normal text-ink-muted">
                {protectedReason}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          ) : null}

          <DropdownMenuItem asChild>
            <Link href={`/admin/listings?ownerId=${user.id}`}>
              View listings ({user.listingCount})
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={protectedReason !== null || changeRole.isPending}
            onSelect={() =>
              changeRole.mutate(
                { id: user.id, role: nextRole },
                {
                  onSuccess: () =>
                    onDone(`${user.fullName} is now a ${nextRole}. Signed out everywhere.`),
                  onError: (error) => onDone(error.message),
                },
              )
            }
          >
            Make {nextRole}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={protectedReason !== null || user.emailVerified || resend.isPending}
            onSelect={() =>
              resend.mutate(user.id, {
                onSuccess: (result) =>
                  onDone(
                    result.sent
                      ? `Verification email sent to ${user.email}.`
                      : `${user.email} is already verified.`,
                  ),
                onError: (error) => onDone(error.message),
              })
            }
          >
            {user.emailVerified ? "Already verified" : "Resend verification"}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={protectedReason !== null || signOut.isPending}
            onSelect={() =>
              signOut.mutate(user.id, {
                onSuccess: (result) =>
                  onDone(
                    result.sessionsRevoked === 0
                      ? `${user.fullName} had no active sessions.`
                      : `Signed ${user.fullName} out of ${result.sessionsRevoked} session${result.sessionsRevoked === 1 ? "" : "s"}.`,
                  ),
                onError: (error) => onDone(error.message),
              })
            }
          >
            Force sign-out
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            disabled={protectedReason !== null}
            onSelect={(event) => {
              // Radix closes the menu on select, which would unmount the dialog
              // with it. Hold the menu open long enough to hand over.
              event.preventDefault();
              setConfirmingDelete(true);
            }}
          >
            Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {user.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {user.listingCount > 0 ? (
                <>
                  This also deletes their {user.listingCount} listing
                  {user.listingCount === 1 ? "" : "s"} and every photo on them. There
                  is no undo, and no way to restore the photos afterwards.
                </>
              ) : (
                <>
                  This removes the account, their saved preferences and their
                  sessions. There is no undo.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(user.id, {
                  onSuccess: () => onDone(`Deleted ${user.fullName}.`),
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

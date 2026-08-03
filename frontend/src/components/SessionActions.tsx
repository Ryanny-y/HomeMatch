"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthenticatedUser } from "@homematch/shared";
import { logout } from "@/features/auth/api/auth.api";
import { Button, ButtonLink } from "@/components/ui/Button";
import { homeFor, SIGNUP_RENTER } from "@/lib/site";

/**
 * The header's right-hand side, which differs by whether anyone is signed in.
 *
 * Offering "Log in" to someone already signed in is the kind of small wrongness
 * that makes a whole screen feel unfinished, so the shell resolves the session
 * server-side and hands the answer down rather than flashing the wrong state
 * while a client request resolves.
 */
export function SessionActions({
  user,
  onNavigate,
  stacked = false,
}: {
  user: AuthenticatedUser | null;
  onNavigate?: () => void;
  stacked?: boolean;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  if (!user) {
    return (
      <div className={stacked ? "mt-4 space-y-3" : "flex items-center gap-3"}>
        <Link
          href="/login"
          onClick={onNavigate}
          className={
            stacked
              ? "block py-3 font-medium text-ink-soft transition-colors hover:text-brand-dark"
              : "rounded-chip px-3 py-2 text-[0.9375rem] font-medium text-ink-muted transition-colors hover:text-brand-dark"
          }
        >
          Log in
        </Link>
        <ButtonLink
          href={SIGNUP_RENTER}
          onClick={onNavigate}
          size={stacked ? "lg" : "md"}
          className={stacked ? "w-full" : undefined}
        >
          Get started
        </ButtonLink>
      </div>
    );
  }

  const isManager = user.role === "landlord" || user.role === "admin";
  const home = homeFor(user.role);

  async function signOut() {
    setLeaving(true);
    try {
      await logout();
    } finally {
      // Push regardless: a failed logout still cleared the cookies client-side,
      // and stranding the user on an authenticated screen is the worse outcome.
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className={stacked ? "mt-4 space-y-3" : "flex items-center gap-3"}>
      <Link
        href={home}
        onClick={onNavigate}
        className={
          stacked
            ? "block py-3 font-medium text-ink-soft transition-colors hover:text-brand-dark"
            : "rounded-chip px-3 py-2 text-[0.9375rem] font-medium text-ink-muted transition-colors hover:text-brand-dark"
        }
      >
        {isManager ? "Your units" : "Your profile"}
      </Link>
      <Button
        variant="secondary"
        size={stacked ? "lg" : "md"}
        onClick={() => void signOut()}
        disabled={leaving}
        className={stacked ? "w-full" : undefined}
      >
        {leaving ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}

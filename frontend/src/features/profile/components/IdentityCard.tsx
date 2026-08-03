"use client";

import Link from "next/link";
import { useState } from "react";
import type { AuthenticatedUser } from "@homematch/shared";
import { resendVerification } from "@/features/auth/api/auth.api";
import { Card, Pill } from "@/components/ui/Card";
import { toApiError } from "@/lib/api";

/**
 * Who is signed in.
 *
 * Read-only, and deliberately so: there is no endpoint to change a name or an
 * email, and drawing an edit affordance for something the API cannot do is the
 * kind of small dishonesty that makes a whole screen feel untrustworthy. The
 * two controls here both reach real routes.
 */
function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function IdentityCard({ user }: { user: AuthenticatedUser }) {
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  async function onResend() {
    setResend("sending");
    try {
      await resendVerification(user.email);
      setResend("sent");
    } catch (error) {
      setFailure(toApiError(error).message);
      setResend("failed");
    }
  }

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface-sunken text-[0.9375rem] font-extrabold tracking-[-0.02em] text-ink-soft"
          >
            {initialsOf(user.fullName)}
          </span>

          <div className="min-w-0">
            <p className="truncate text-[1.0625rem] font-extrabold tracking-[-0.02em] text-ink">
              {user.fullName}
            </p>
            <p className="truncate text-[0.875rem] text-ink-muted">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill className="bg-surface-sunken text-ink-muted">Renter</Pill>
          {user.emailVerified ? (
            <Pill className="bg-live-soft text-live-ink">Email verified</Pill>
          ) : (
            <Pill className="bg-gold-soft text-gold-ink">Email not verified</Pill>
          )}
        </div>
      </div>

      {user.emailVerified ? null : (
        <div className="mt-5 rounded-chip bg-gold-soft/50 px-4 py-3.5">
          <p className="text-[0.875rem] leading-relaxed text-ink-soft">
            Some features stay locked until you confirm the address.
          </p>

          {resend === "sent" ? (
            <p role="status" className="mt-2 text-[0.875rem] font-semibold text-ink">
              Sent. Check {user.email} — the link expires in an hour.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void onResend()}
              disabled={resend === "sending"}
              className="mt-2 text-[0.875rem] font-semibold text-brand-dark underline underline-offset-4 transition-colors hover:text-brand disabled:opacity-60"
            >
              {resend === "sending" ? "Sending…" : "Resend verification email"}
            </button>
          )}

          {resend === "failed" && failure ? (
            <p role="alert" className="mt-2 text-[0.875rem] text-danger">
              {failure}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        {/* Real route: a signed-in renter can use the reset flow, which emails a
            link rather than asking for the current password. The hint says so,
            because a control that silently sends mail is a surprise. */}
        <Link
          href="/forgot-password"
          className="text-[0.9375rem] font-semibold text-brand-dark transition-colors hover:text-brand"
        >
          Change password
        </Link>
        <span className="ml-2 text-[0.875rem] text-ink-muted">We&rsquo;ll email you a link.</span>
      </div>
    </Card>
  );
}

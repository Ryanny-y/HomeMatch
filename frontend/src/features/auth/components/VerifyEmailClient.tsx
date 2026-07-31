"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { resendVerification, verifyEmail } from "@/features/auth/api/auth.api";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { toApiError } from "@/lib/api";

type VerifyState =
  | { status: "verifying" }
  | { status: "verified" }
  | { status: "failed"; message: string };

/**
 * Confirming a token that arrived in the URL.
 *
 * KNOWN DEVIATION from the "never fetch in useEffect" rule: the request has to
 * fire on mount from a URL parameter, and there is no query client yet. This is
 * the first thing to move once TanStack Query is adopted — see the adoption
 * table in `frontend/CLAUDE.md`.
 *
 * The request fires once per token: in development React mounts effects twice,
 * and a single-use verification token would burn on the first call and report
 * failure on the second.
 */
function TokenVerification({ token }: { token: string }) {
  const [state, setState] = useState<VerifyState>({ status: "verifying" });
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (attempted.current === token) return;
    attempted.current = token;

    let active = true;

    verifyEmail(token)
      .then(() => {
        if (active) setState({ status: "verified" });
      })
      .catch((thrown: unknown) => {
        if (active) {
          setState({ status: "failed", message: toApiError(thrown).message });
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === "verifying") {
    return (
      <>
        <AuthHeading eyebrow="Email verification" title="Confirming your email…">
          This takes a second.
        </AuthHeading>
        <p aria-live="polite" className="sr-only">
          Verifying your email address.
        </p>
      </>
    );
  }

  if (state.status === "verified") {
    return (
      <>
        <AuthHeading eyebrow="Email verification" title="You're verified">
          Your email is confirmed. Set up your profile and we&rsquo;ll start
          scoring apartments against it.
        </AuthHeading>

        <ButtonLink href="/onboarding" size="lg" className="w-full">
          Set up my profile
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <AuthHeading eyebrow="Email verification" title="This link didn't work">
        {state.message}
      </AuthHeading>

      <Alert tone="info" title="What to try">
        Verification links expire and can only be used once. Log in and
        we&rsquo;ll send you a new one.
      </Alert>

      <ButtonLink href="/login" size="lg" className="mt-6 w-full">
        Log in
      </ButtonLink>
    </>
  );
}

/** The post-signup screen: no token yet, just an inbox to go and check. */
function AwaitingInbox({ email }: { email: string | null }) {
  const [resent, setResent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend(): Promise<void> {
    if (!email) return;

    setPending(true);
    setError(null);

    try {
      await resendVerification(email);
      setResent(true);
    } catch (thrown) {
      setError(toApiError(thrown).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading eyebrow="One more step" title="Check your inbox">
        {email ? (
          <>
            We sent a verification link to{" "}
            <strong className="text-ink">{email}</strong>. Open it and
            you&rsquo;re in.
          </>
        ) : (
          <>
            We sent a verification link to the address you signed up with. Open
            it and you&rsquo;re in.
          </>
        )}
      </AuthHeading>

      {error ? (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {resent ? (
        <Alert tone="success" title="Sent again">
          A new verification link is on its way. The previous one no longer
          works.
        </Alert>
      ) : (
        <Alert tone="info" title="Nothing arrived?">
          Give it a couple of minutes and check your spam folder — verification
          mail often lands there the first time.
        </Alert>
      )}

      {email && !resent ? (
        <Button
          variant="secondary"
          size="lg"
          onClick={resend}
          disabled={pending}
          className="mt-6 w-full"
        >
          {pending ? "Sending…" : "Resend verification email"}
        </Button>
      ) : null}

      <p className="mt-8 border-t border-line pt-6 text-[0.9375rem] text-ink-muted">
        Already verified?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:text-brand-dark"
        >
          Log in
        </Link>
      </p>
    </>
  );
}

export function VerifyEmailClient({
  token,
  email,
}: {
  token: string | null;
  email: string | null;
}) {
  return token ? (
    <TokenVerification token={token} />
  ) : (
    <AwaitingInbox email={email} />
  );
}

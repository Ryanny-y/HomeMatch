"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { requestPasswordReset } from "@/features/auth/api/auth.api";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { useZodForm } from "@/features/auth/hooks/useZodForm";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schemas";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const values = useMemo(() => ({ email }), [email]);

  const onSuccess = useCallback(() => {
    setSentTo(email.trim());
  }, [email]);

  const { errors, formError, pending, formRef, handleSubmit } = useZodForm({
    schema: forgotPasswordSchema,
    values,
    submit: requestPasswordReset,
    onSuccess,
  });

  /* The confirmation deliberately does not say whether an account exists —
     that answer would let anyone test which addresses are registered here. */
  if (sentTo) {
    return (
      <>
        <AuthHeading eyebrow="Check your inbox" title="Reset link sent">
          If an account exists for <strong className="text-ink">{sentTo}</strong>
          , a password reset link is on its way. The link works once and expires
          in 60 minutes.
        </AuthHeading>

        <Alert tone="info" title="Nothing arrived?">
          Give it a couple of minutes, then check your spam folder. You can also{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:text-brand-dark"
          >
            try a different address
          </button>
          .
        </Alert>

        <p className="mt-8 border-t border-line pt-6 text-[0.9375rem] text-ink-muted">
          <Link
            href="/login"
            className="font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:text-brand-dark"
          >
            Back to log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <AuthHeading eyebrow="Password reset" title="Forgot your password?">
        Enter the email you signed up with and we&rsquo;ll send you a link to
        set a new one.
      </AuthHeading>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? <Alert>{formError}</Alert> : null}

        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-8 border-t border-line pt-6 text-[0.9375rem] text-ink-muted">
        Remembered it?{" "}
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

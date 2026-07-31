"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";
import { resetPassword } from "@/features/auth/api/auth.api";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { useZodForm } from "@/features/auth/hooks/useZodForm";
import {
  PASSWORD_MIN_LENGTH,
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas/auth.schemas";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [done, setDone] = useState(false);

  const values = useMemo(
    () => ({ token: token ?? "", password, confirmation }),
    [token, password, confirmation],
  );

  const submit = useCallback(
    (input: ResetPasswordInput) =>
      resetPassword({ token: input.token, password: input.password }),
    [],
  );

  const onSuccess = useCallback(() => setDone(true), []);

  const { errors, formError, pending, formRef, handleSubmit } = useZodForm({
    schema: resetPasswordSchema,
    values,
    submit,
    onSuccess,
  });

  /* Arriving without a token means the link was truncated by a mail client or
     retyped by hand. Say that plainly and offer the one action that fixes it. */
  if (!token) {
    return (
      <>
        <AuthHeading eyebrow="Password reset" title="This link is incomplete">
          The reset link is missing its token, which usually means it was cut
          short somewhere between the email and the browser. Request a fresh one
          and open it directly from your inbox.
        </AuthHeading>

        <ButtonLink href="/forgot-password" size="lg" className="w-full">
          Send a new reset link
        </ButtonLink>
      </>
    );
  }

  if (done) {
    return (
      <>
        <AuthHeading eyebrow="Password reset" title="Your password is updated">
          You can log in with your new password now. Any other devices already
          signed in have been logged out.
        </AuthHeading>

        <ButtonLink href="/login" size="lg" className="w-full">
          Log in
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <AuthHeading eyebrow="Password reset" title="Set a new password">
        Choose something you haven&rsquo;t used on HomeMatch before.
      </AuthHeading>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <Alert>
            {formError}{" "}
            <Link
              href="/forgot-password"
              className="font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:text-brand-dark"
            >
              Request a new link
            </Link>
            .
          </Alert>
        ) : null}

        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        <PasswordField
          label="Confirm new password"
          name="confirmation"
          autoComplete="new-password"
          value={confirmation}
          onChange={setConfirmation}
          error={errors.confirmation}
        />

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </>
  );
}

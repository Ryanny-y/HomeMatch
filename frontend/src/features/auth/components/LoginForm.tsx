"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import type { SessionResponse } from "@homematch/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { login } from "@/features/auth/api/auth.api";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { useZodForm } from "@/features/auth/hooks/useZodForm";
import { loginSchema } from "@/features/auth/schemas/auth.schemas";
import { homeFor } from "@/lib/site";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const values = useMemo(() => ({ email, password }), [email, password]);

  const onSuccess = useCallback(
    (session: SessionResponse) => {
      // The session cookie is set by the API; nothing to store client-side.
      // `refresh()` clears cached server-rendered output for the old session.
      //
      // Routed from the returned role rather than always sending everyone to
      // /dashboard: that page redirects landlords anyway, and bouncing through
      // it costs a second navigation on the slow connection this product
      // assumes. /dashboard stays the safety net for every other entry point.
      router.push(homeFor(session.user.role));
      router.refresh();
    },
    [router],
  );

  const { errors, formError, pending, formRef, handleSubmit } = useZodForm({
    schema: loginSchema,
    values,
    submit: login,
    onSuccess,
  });

  return (
    <>
      <AuthHeading eyebrow="Welcome back" title="Log in to HomeMatch">
        Your saved apartments, shortlists, and match scores are where you left
        them.
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

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[0.875rem] font-medium text-ink-muted transition-colors hover:text-brand"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-8 border-t border-line pt-6 text-[0.9375rem] text-ink-muted">
        New here?{" "}
        <Link
          href="/signup?role=renter"
          className="font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:text-brand-dark"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}

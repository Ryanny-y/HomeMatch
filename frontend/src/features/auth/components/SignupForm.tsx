"use client";

import { ERROR_CODES } from "@homematch/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { register } from "@/features/auth/api/auth.api";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { PasswordStrength } from "@/features/auth/components/PasswordStrength";
import { useZodForm } from "@/features/auth/hooks/useZodForm";
import {
  PASSWORD_MIN_LENGTH,
  signupSchema,
  type UserRole,
} from "@/features/auth/schemas/auth.schemas";
import type { ApiError } from "@/lib/api";

const ROLES = [
  {
    value: "renter",
    label: "I'm looking for a place",
    description:
      "Get apartments scored against your budget, commute, and must-haves.",
  },
  {
    value: "landlord",
    label: "I have a place to rent out",
    description:
      "List your unit and reach renters who already know it fits. Free during launch.",
  },
] as const satisfies readonly { value: UserRole; label: string; description: string }[];

/**
 * Radio group, not a pair of buttons — the choice is exclusive, has a default,
 * and needs to be reachable with arrow keys. A `fieldset` gives the group its
 * own accessible name so it isn't read as two unrelated controls.
 */
function RolePicker({
  value,
  onChange,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
}) {
  const groupName = useId();

  return (
    <fieldset>
      <legend className="text-[0.875rem] font-semibold text-ink">
        I&rsquo;m signing up as
      </legend>

      <div className="mt-2 space-y-2.5">
        {ROLES.map((role) => {
          const selected = value === role.value;

          return (
            <label
              key={role.value}
              // Selection reads from a doubled edge and the filled radio rather
              // than a tinted panel — the ring adds the weight the fill used to
              // carry, without putting brand colour across the whole card or
              // shifting the layout by a pixel.
              className={`flex cursor-pointer gap-3 rounded-chip border bg-surface p-4 transition-colors ${
                selected
                  ? "border-brand ring-1 ring-brand"
                  : "border-line hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={role.value}
                checked={selected}
                onChange={() => onChange(role.value)}
                className="mt-1 h-4 w-4 shrink-0 accent-brand"
              />
              <span>
                <span className="block text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                  {role.label}
                </span>
                <span className="mt-1 block text-[0.875rem] leading-snug text-ink-muted">
                  {role.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SignupForm({ initialRole }: { initialRole: UserRole }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const values = useMemo(
    () => ({ fullName, email, password, role }),
    [fullName, email, password, role],
  );

  const onSuccess = useCallback(() => {
    router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
  }, [router, email]);

  // A duplicate account comes back as a conflict, not a field error, but the
  // only place it can be fixed is the email field.
  const mapError = useCallback(
    (error: ApiError) =>
      error.code === ERROR_CODES.CONFLICT
        ? { email: error.message }
        : undefined,
    [],
  );

  const { errors, formError, pending, formRef, handleSubmit } = useZodForm({
    schema: signupSchema,
    values,
    submit: register,
    onSuccess,
    mapError,
  });

  return (
    <>
      <AuthHeading eyebrow="Create your account" title="Start with what you need">
        Free for renters, free for landlords during launch. It takes about a
        minute.
      </AuthHeading>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? <Alert>{formError}</Alert> : null}

        <RolePicker value={role} onChange={setRole} />

        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          placeholder="Maria Santos"
          value={fullName}
          onChange={setFullName}
          error={errors.fullName}
        />

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
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
          value={password}
          onChange={setPassword}
          error={errors.password}
        >
          <PasswordStrength password={password} />
        </PasswordField>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Creating your account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 border-t border-line pt-6 text-[0.9375rem] text-ink-muted">
        Already have an account?{" "}
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

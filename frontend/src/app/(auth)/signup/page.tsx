import type { Metadata } from "next";

import { SignupForm, userRoleSchema, type UserRole } from "@/features/auth";
import { firstParam, type SearchParams } from "@/lib/params";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Sign up for HomeMatch AI as a renter or a landlord. Free for renters, and free to list during launch.",
  alternates: { canonical: "/signup" },
};

/**
 * `?role=` preselects the radio group so the two hero CTAs land on a form that
 * already reflects which button was pressed. Only `renter` and `landlord` sign
 * up publicly — `admin` exists as a role but is never self-served, so anything
 * the schema rejects falls back to `renter` rather than erroring.
 */
function roleFrom(value: string | null): UserRole {
  const parsed = userRoleSchema.safeParse(value);
  return parsed.success ? parsed.data : "renter";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return <SignupForm initialRole={roleFrom(firstParam(params.role))} />;
}

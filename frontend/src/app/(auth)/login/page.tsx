import type { Metadata } from "next";

import { LoginForm } from "@/features/auth";
import { firstValues } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in to HomeMatch AI to see your saved Quezon City apartments, match scores, and shortlists.",
  alternates: { canonical: "/login" },
};

/**
 * `?next=` carries where the visitor was headed before the login wall stopped
 * them, so a gated page can send them back to it. Read here and passed down
 * rather than read from `window` in the form, so the value is present on the
 * first render and the redirect does not wait for hydration.
 *
 * It is deliberately not trusted — `safeNext` in `lib/site.ts` decides whether
 * it is a path on this site before anyone is sent there.
 *
 * `searchParams` is a Promise in Next 16.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = firstValues(await searchParams);

  return <LoginForm next={next} />;
}

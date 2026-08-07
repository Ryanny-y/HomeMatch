import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { RenterPreferenceDto } from "@homematch/shared";

import { OnboardingScreen } from "@/features/profile";
import { apiGet } from "@/lib/api";
import { forwardedCookies, requireUser } from "@/lib/session";
import { homeFor } from "@/lib/site";
import { QueryProvider } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Set up your search",
  robots: { index: false, follow: false },
};

/**
 * The renter first-run gate, and where `entryFor("renter")` lands.
 *
 * **The preference row is the only authority on whether it has been seen.**
 * Deciding here rather than in `LoginForm` costs a returning renter one
 * server-side hop, and buys a gate that also covers a bookmark, a typed URL and
 * a session resumed from a refresh token — none of which pass through the login
 * form at all.
 *
 * `onboardedAt` is stamped by saving *or* skipping, so this is a question asked
 * exactly once.
 */
export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");

  // Landlords and admins have no renter profile to fill in — the API answers
  // /api/profile with a 403 for them, so rendering the form would show a
  // loading state that resolves into an error.
  if (user.role !== "renter") redirect(homeFor(user.role));

  const cookie = await forwardedCookies();
  const { preference } = await apiGet<{ preference: RenterPreferenceDto }>(
    "/api/profile",
    cookie ? { cookie } : undefined,
  );

  if (preference.onboardedAt !== null) redirect("/browse");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <QueryProvider>
        <OnboardingScreen />
      </QueryProvider>
    </main>
  );
}

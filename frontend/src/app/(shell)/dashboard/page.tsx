import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/ComingSoon";
import { currentUser } from "@/lib/session";
import { entryFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * The role router the roadmap specifies: every role's post-login entry point,
 * sent on to wherever it actually belongs.
 *
 * The login form already routes by role, so this mostly catches everything
 * else — a bookmark, an old link, a guard redirecting here. A renter falls
 * through to ComingSoon, which stays honest: their home genuinely is not built.
 */
export default async function DashboardPage() {
  const user = await currentUser();
  // `entryFor`, not `homeFor`: this is a session entry point, so a renter who
  // has never onboarded should be asked here too rather than dropped straight
  // into their profile.
  const entry = user ? entryFor(user.role) : null;

  if (entry && entry !== "/dashboard") redirect(entry);

  return (
    <ComingSoon
      eyebrow="Dashboard"
      title="Your dashboard is being built"
      description="This is where your saved apartments, active shortlists, and recent match scores will live, with your true monthly cost totals across everything you're considering. It isn't wired up yet — the landing page is the honest picture of what works today."
      action={{ label: "See how it works", href: "/#how-it-works" }}
    />
  );
}

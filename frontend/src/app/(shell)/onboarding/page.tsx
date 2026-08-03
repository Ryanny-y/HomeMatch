import { redirect } from "next/navigation";

/**
 * Retired in favour of `/profile`.
 *
 * This route promised the preference form, and `/profile` now is that form —
 * its empty state does the first-run job a separate onboarding screen would
 * have, so two surfaces would be two copies of one set of fields to keep in
 * sync. The route is kept as a redirect rather than deleted because it has been
 * linked from copy and may be bookmarked.
 */
export default function OnboardingPage() {
  redirect("/profile");
}

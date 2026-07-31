import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <ComingSoon
      eyebrow="Profile setup"
      title="Profile setup is next on the list"
      description="This is where you'll set your budget, where you work or study, how you get there, and the things you won't compromise on — the profile every match score is calculated against. It isn't built yet, so nothing you enter would be scored."
      action={{ label: "What gets scored", href: "/#match-score" }}
    />
  );
}

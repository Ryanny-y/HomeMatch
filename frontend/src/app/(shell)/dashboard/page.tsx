import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <ComingSoon
      eyebrow="Dashboard"
      title="Your dashboard is being built"
      description="This is where your saved apartments, active shortlists, and recent match scores will live, with your true monthly cost totals across everything you're considering. It isn't wired up yet — the landing page is the honest picture of what works today."
      action={{ label: "See how it works", href: "/#how-it-works" }}
    />
  );
}

import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Browse apartments",
  robots: { index: false, follow: false },
};

export default function BrowsePage() {
  return (
    <ComingSoon
      eyebrow="Browse"
      title="The catalog isn't open yet"
      description="Browsing opens once there are enough hand-verified Quezon City listings to be worth searching. Every listing is checked by a person and its cost, commute, and neighborhood fields filled in before it goes live, so this takes longer than scraping would — which is rather the point."
      action={{ label: "Get notified — create an account", href: "/signup?role=renter" }}
    />
  );
}

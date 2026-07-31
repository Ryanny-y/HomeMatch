import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Landlord dashboard",
  robots: { index: false, follow: false },
};

export default function LandlordPage() {
  return (
    <ComingSoon
      eyebrow="For landlords"
      title="The landlord dashboard is being built"
      description="This is where you'll manage your units and see views, saves, and expressions of interest per listing. Creating a landlord account works today, so you'll be set up the moment it opens."
      action={{ label: "List your property", href: "/signup?role=landlord" }}
    />
  );
}

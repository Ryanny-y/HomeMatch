import type { Metadata } from "next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/session";
import { LandingSections } from "@/features/landing";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  return (
    <>
      <SiteHeader user={await currentUser()} />
      <LandingSections />
      <SiteFooter />
    </>
  );
}

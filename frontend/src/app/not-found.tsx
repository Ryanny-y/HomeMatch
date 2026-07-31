import type { Metadata } from "next";
import { PiMagnifyingGlass } from "react-icons/pi";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card, IconBadge } from "@/components/ui/Card";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex flex-1 items-center py-20 sm:py-28">
        <Container>
          <Card className="mx-auto max-w-2xl p-8 sm:p-10">
            <IconBadge
              icon={PiMagnifyingGlass}
              className="bg-brand-soft text-brand"
            />

            <p
              data-figure=""
              className="mt-5 text-[0.8125rem] font-semibold tracking-[0.16em] text-brand-dark"
            >
              404
            </p>
            <h1 className="mt-2 text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.08]">
              This page doesn&rsquo;t exist
            </h1>
            <p className="mt-4 text-lg leading-[1.6] text-ink-muted">
              The address may be mistyped, or the page may not be built yet.
              Everything that works today is on the home page.
            </p>

            <ButtonLink href="/" size="lg" className="mt-8">
              Back to home
            </ButtonLink>
          </Card>
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}

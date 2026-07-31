import Link from "next/link";
import { PiArrowRight } from "react-icons/pi";

import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";

export function FinalCta() {
  return (
    <section
      id="get-started"
      aria-labelledby="final-cta-heading"
      className="scroll-mt-20 bg-canvas pb-20 sm:pb-24"
    >
      <Container>
        <div className="rounded-card bg-brand-deep px-6 py-14 text-white sm:px-12 sm:py-16">
          <div className="max-w-3xl">
            <h2
              id="final-cta-heading"
              className="text-[clamp(1.875rem,4vw,3rem)] leading-[1.05] text-white"
            >
              Find the right home, not just another listing.
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-[1.6] text-white/75">
              Set up your profile once, and every apartment in Quezon City
              arrives already scored, priced honestly, and ready to compare.
            </p>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              {/* The arrow leans into the direction it points on hover — the
                  page's last control, saying which way it goes. */}
              <ButtonLink
                href="/signup?role=renter"
                size="lg"
                variant="onDark"
                className="group"
              >
                Create your free account
                <PiArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-[var(--dur-state)] ease-arrival motion-safe:group-hover:translate-x-1"
                />
              </ButtonLink>
              <Link
                href="/login"
                className="text-[0.9375rem] font-medium text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              >
                Already have an account? Log in
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

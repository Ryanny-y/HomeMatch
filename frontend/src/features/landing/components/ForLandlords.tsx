import type { IconType } from "react-icons";
import { PiChartLineUp, PiStorefront, PiTag, PiUsersThree } from "react-icons/pi";

import { ButtonLink } from "@/components/ui/Button";
import { Card, IconBadge } from "@/components/ui/Card";
import { Container, Eyebrow, Lede, SectionHeading } from "@/components/ui/Section";
import { SIGNUP_LANDLORD } from "@/lib/site";

const BENEFITS: readonly { label: string; body: string; icon: IconType; tint: string }[] = [
  {
    label: "Free to list during launch",
    icon: PiTag,
    tint: "bg-amber-50 text-amber-600",
    body: "No listing fee, no commission, no featured-placement upsell while we build out the Quezon City catalog.",
  },
  {
    label: "See what your listing is doing",
    icon: PiChartLineUp,
    tint: "bg-violet-50 text-violet-600",
    body: "Views, saves, and expressions of interest per unit — so you know whether the problem is the price, the photos, or the market.",
  },
  {
    label: "Fewer wasted viewings",
    icon: PiUsersThree,
    tint: "bg-cyan-50 text-cyan-600",
    body: "Your listing carries its cost breakdown, commute times, and neighborhood detail, so the people who ask to see it have already worked out that it fits.",
  },
];

export function ForLandlords() {
  return (
    <section
      id="for-landlords"
      aria-labelledby="for-landlords-heading"
      className="scroll-mt-20 bg-surface py-20 sm:py-24"
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="rise">
            <Eyebrow icon={PiStorefront}>For landlords</Eyebrow>
            <SectionHeading id="for-landlords-heading">
              Reach renters who already know your unit fits.
            </SectionHeading>
            <Lede>
              A listing on HomeMatch isn&rsquo;t a classified ad. It carries
              enough structured detail that a renter can rule it in or out
              before they message you — which means the ones who do message you
              are worth your Saturday.
            </Lede>

            <ButtonLink href={SIGNUP_LANDLORD} size="lg" className="mt-8">
              List your property
            </ButtonLink>
          </div>

          <div className="grid gap-4">
            {BENEFITS.map((benefit) => (
              <Card key={benefit.label} className="flex items-start gap-4 p-5 sm:p-6">
                <IconBadge icon={benefit.icon} className={benefit.tint} />
                <div>
                  <h3 className="text-lg font-extrabold tracking-[-0.03em]">
                    {benefit.label}
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-muted">
                    {benefit.body}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

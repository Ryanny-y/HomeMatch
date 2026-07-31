import type { IconType } from "react-icons";
import { PiChartLineUp, PiStorefront, PiTag, PiUsersThree } from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { IconBadge } from "@/components/ui/Card";
import { Eyebrow, Lede, Section, SectionHeading } from "@/components/ui/Section";
import { SIGNUP_LANDLORD } from "@/lib/site";

/**
 * The one place the page stops talking to renters.
 *
 * It is set on the deep ground for exactly that reason. Everything above and
 * below is one continuous argument aimed at someone deciding where to live;
 * this is aimed at someone with a unit to fill. The change of ground is the
 * cheapest way to say "this part is for someone else" before a word is read,
 * and it is the only thing on the page that switches audience — which is why it
 * earns a region rather than an accent.
 *
 * The panels reuse the on-dark idiom from `Solution.tsx` rather than inventing
 * a second one: a hairline over a barely-lifted white wash, because a solid
 * card on this ground would punch a hole in it.
 */

const BENEFITS: readonly { label: string; body: string; icon: IconType }[] = [
  {
    label: "Free to list during launch",
    icon: PiTag,
    body: "No listing fee, no commission, no featured-placement upsell while we build out the Quezon City catalog.",
  },
  {
    label: "See what your listing is doing",
    icon: PiChartLineUp,
    body: "Views, saves, and expressions of interest per unit — so you know whether the problem is the price, the photos, or the market.",
  },
  {
    label: "Fewer wasted viewings",
    icon: PiUsersThree,
    body: "Your listing carries its cost breakdown, commute times, and neighborhood detail, so the people who ask to see it have already worked out that it fits.",
  },
];

export function ForLandlords() {
  return (
    <Section id="for-landlords" tone="deep" labelledBy="for-landlords-heading">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
        <Reveal>
          <Eyebrow icon={PiStorefront} onDark>
            For landlords
          </Eyebrow>
          <SectionHeading id="for-landlords-heading" className="text-white">
            Reach renters who already know your unit fits.
          </SectionHeading>
          <Lede onDark>
            A listing on HomeMatch isn&rsquo;t a classified ad. It carries enough
            structured detail that a renter can rule it in or out before they
            message you — which means the ones who do message you are worth your
            Saturday.
          </Lede>

          <ButtonLink
            href={SIGNUP_LANDLORD}
            size="lg"
            variant="onDark"
            className="mt-8"
          >
            List your property
          </ButtonLink>
        </Reveal>

        <div className="grid gap-4">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.label}
              className="flex items-start gap-4 rounded-card border border-white/15 bg-white/[0.07] p-5 sm:p-6"
            >
              <IconBadge icon={benefit.icon} tone="onDark" />
              <div>
                <h3 className="text-lg font-extrabold tracking-[-0.03em] text-white">
                  {benefit.label}
                </h3>
                <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-white/75">
                  {benefit.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

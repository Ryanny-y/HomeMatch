import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import {
  PiCalculator,
  PiListChecks,
  PiMagnifyingGlass,
  PiScales,
  PiSlidersHorizontal,
} from "react-icons/pi";

import { ButtonLink } from "@/components/ui/Button";
import { Card, IconBadge } from "@/components/ui/Card";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/Section";
import { SIGNUP_RENTER } from "@/lib/site";

/**
 * The one place on this page where numbering is honest: these four things
 * happen in this order, and step three depends on step one having happened.
 * It is marked up as an ordered list for that reason.
 */

const STEPS: readonly { label: string; body: string; icon: IconType; tint: string }[] = [
  {
    label: "Tell us what you need",
    icon: PiSlidersHorizontal,
    tint: "bg-blue-50 text-blue-600",
    body: "Your budget, where you work or study, how you get there, and the things you won't compromise on — pets, parking, household size.",
  },
  {
    label: "Browse what fits",
    icon: PiMagnifyingGlass,
    tint: "bg-violet-50 text-violet-600",
    body: "Every listing arrives already scored against that profile, with the reasons for the score written out in plain language.",
  },
  {
    label: "See what it really costs",
    icon: PiCalculator,
    tint: "bg-amber-50 text-amber-600",
    body: "Rent, parking, utilities, internet, dues, and amortised move-in cost, itemised into one honest monthly figure.",
  },
  {
    label: "Compare and decide",
    icon: PiScales,
    tint: "bg-cyan-50 text-cyan-600",
    body: "Put your shortlist side by side, read the trade-offs, and pick the one you can defend to yourself six months from now.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" labelledBy="how-it-works-heading">
      <div className="rise max-w-3xl">
        <Eyebrow icon={PiListChecks}>How it works</Eyebrow>
        <SectionHeading id="how-it-works-heading">
          Four steps between you and a decision you trust.
        </SectionHeading>
      </div>

      {/* The one grid where a stagger carries information rather than sparkle:
          these four things happen in this order, so they arrive in it. */}
      <ol className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.label} style={{ "--i": index } as CSSProperties}>
            <Card className="h-full p-6">
              <div className="flex items-center justify-between">
                <IconBadge icon={step.icon} className={step.tint} />
                <span
                  data-figure=""
                  className="text-2xl font-extrabold tracking-[-0.04em] text-line-strong"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold tracking-[-0.03em]">
                {step.label}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-[1.6] text-ink-muted">
                {step.body}
              </p>
            </Card>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <ButtonLink href={SIGNUP_RENTER} size="lg">
          Find my match
        </ButtonLink>
      </div>
    </Section>
  );
}

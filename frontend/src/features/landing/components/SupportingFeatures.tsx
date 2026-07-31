import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  PiBookmarkSimple,
  PiCards,
  PiGridFour,
  PiMapTrifold,
  PiPath,
} from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { Card, IconBadge } from "@/components/ui/Card";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/Section";

/**
 * The lighter tier of features. These matter, but they support the three
 * differentiators rather than competing with them, so they get a card and a
 * paragraph each instead of a full section and a rendered example.
 */

type Feature = {
  title: string;
  body: ReactNode;
  icon: IconType;
};

const FEATURES: readonly Feature[] = [
  {
    title: "Commute intelligence",
    icon: PiPath,
    body: (
      <>
        Drive time, transit time, and a separate rush-hour estimate to the
        destinations you save — Cubao, UP Diliman, Katipunan, BGC, or wherever
        you actually go every day. Stored per listing, so you never open Maps in
        another tab to check.
      </>
    ),
  },
  {
    title: "Neighborhood intelligence",
    icon: PiMapTrifold,
    body: (
      <>
        Groceries, schools, hospitals, and the nearest transit for every unit,
        plus a walkability read and a flood-risk note — which, in Quezon City,
        is not a footnote.
      </>
    ),
  },
  {
    title: "Discovery",
    icon: PiCards,
    body: (
      <>
        Review apartments one at a time and mark each one Interested, Skip, or
        Save. Swiping is optional, not the point: the buttons and keyboard
        shortcuts do exactly the same thing, and nothing is hidden behind a
        gesture.
      </>
    ),
  },
  {
    title: "Save & shortlist",
    icon: PiBookmarkSimple,
    body: (
      <>
        Everything you save lands in one place with its score and true monthly
        cost attached, ready to be compared later — instead of scattered across
        screenshots and chat threads.
      </>
    ),
  },
];

export function SupportingFeatures() {
  return (
    <Section id="supporting-features" tone="surface" labelledBy="supporting-heading">
      <Reveal className="max-w-3xl">
        <Eyebrow icon={PiGridFour}>Also included</Eyebrow>
        <SectionHeading id="supporting-heading">
          The context you would otherwise gather by hand.
        </SectionHeading>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title} tone="sunken" className="h-full p-6 sm:p-7">
            <IconBadge icon={feature.icon} tone="onSunken" />
            <h3 className="mt-4 text-xl font-extrabold tracking-[-0.03em]">
              {feature.title}
            </h3>
            <p className="mt-2.5 leading-[1.6] text-ink-muted">{feature.body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

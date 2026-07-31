import type { IconType } from "react-icons";
import {
  PiChatsCircle,
  PiClock,
  PiMagnifyingGlass,
  PiMapTrifold,
  PiQuestion,
  PiStorefront,
  PiTable,
} from "react-icons/pi";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Card, IconBadge } from "@/components/ui/Card";
import { Eyebrow, Lede, Section, SectionHeading } from "@/components/ui/Section";

/**
 * What renting actually looks like today. Deliberately not numbered — these
 * are six parallel chores, not six steps, and numbering them would imply an
 * order that does not exist.
 */

const CHORES: readonly { icon: IconType; text: string }[] = [
  {
    icon: PiMagnifyingGlass,
    text: "Search across multiple platforms and Facebook groups",
  },
  {
    icon: PiTable,
    text: "Compare prices manually in a spreadsheet or notes app",
  },
  {
    icon: PiMapTrifold,
    text: "Check Google Maps for commute times, one listing at a time",
  },
  {
    icon: PiStorefront,
    text: "Look up nearby groceries, schools, and hospitals",
  },
  {
    icon: PiQuestion,
    text: "Guess at utilities, association dues, and moving costs",
  },
  {
    icon: PiChatsCircle,
    text: "Ask friends for opinions",
  },
];

export function Problem() {
  return (
    <Section id="problem" tone="surface" labelledBy="problem-heading">
      <Reveal className="max-w-3xl">
        <Eyebrow icon={PiClock}>The problem</Eyebrow>
        <SectionHeading id="problem-heading">
          Finding an apartment is fragmented and exhausting.
        </SectionHeading>
        <Lede>
          Not because there is nothing available — because the work of deciding
          is left entirely to you. Here is what that actually involves.
        </Lede>
      </Reveal>

      {/* Staggered because the point is accumulation: the chores pile up on you
          one after another, which is the complaint the section is making. */}
      <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHORES.map((chore, index) => (
          <RevealItem key={chore.text} index={index}>
            <Card tone="sunken" className="flex h-full items-start gap-3.5 p-5">
              <IconBadge icon={chore.icon} tone="onSunken" size="sm" />
              <span className="pt-1.5 text-[0.9375rem] leading-snug text-ink-soft">
                {chore.text}
              </span>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal className="mt-12 max-w-3xl">
        <p className="text-[clamp(1.375rem,2.8vw,1.875rem)] leading-[1.25] font-extrabold tracking-[-0.03em]">
          Existing platforms show you listings.{" "}
          <span className="text-brand">They don&rsquo;t help you decide.</span>
        </p>
      </Reveal>
    </Section>
  );
}

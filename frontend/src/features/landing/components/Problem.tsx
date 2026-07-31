import type { CSSProperties } from "react";
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

import { Card, IconBadge } from "@/components/ui/Card";
import { Eyebrow, Lede, Section, SectionHeading } from "@/components/ui/Section";

/**
 * What renting actually looks like today. Deliberately not numbered — these
 * are six parallel chores, not six steps, and numbering them would imply an
 * order that does not exist.
 */

const CHORES: readonly { icon: IconType; text: string; tint: string }[] = [
  {
    icon: PiMagnifyingGlass,
    text: "Search across multiple platforms and Facebook groups",
    tint: "bg-blue-50 text-blue-600",
  },
  {
    icon: PiTable,
    text: "Compare prices manually in a spreadsheet or notes app",
    tint: "bg-violet-50 text-violet-600",
  },
  {
    icon: PiMapTrifold,
    text: "Check Google Maps for commute times, one listing at a time",
    tint: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: PiStorefront,
    text: "Look up nearby groceries, schools, and hospitals",
    tint: "bg-amber-50 text-amber-600",
  },
  {
    icon: PiQuestion,
    text: "Guess at utilities, association dues, and moving costs",
    tint: "bg-rose-50 text-rose-600",
  },
  {
    icon: PiChatsCircle,
    text: "Ask friends for opinions",
    tint: "bg-orange-50 text-orange-600",
  },
];

export function Problem() {
  return (
    <Section id="problem" tone="surface" labelledBy="problem-heading">
      <div className="rise max-w-3xl">
        <Eyebrow icon={PiClock}>The problem</Eyebrow>
        <SectionHeading id="problem-heading">
          Finding an apartment is fragmented and exhausting.
        </SectionHeading>
        <Lede>
          Not because there is nothing available — because the work of deciding
          is left entirely to you. Here is what that actually involves.
        </Lede>
      </div>

      {/* Staggered because the point is accumulation: the chores pile up on you
          one after another, which is the complaint the section is making. `--i`
          shifts each card's scroll range rather than delaying it, since a
          progress-based timeline has no use for `animation-delay`. */}
      <ul className="stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHORES.map((chore, index) => (
          <li key={chore.text} style={{ "--i": index } as CSSProperties}>
            <Card tone="sunken" className="flex h-full items-start gap-3.5 p-5">
              <IconBadge icon={chore.icon} className={chore.tint} size="sm" />
              <span className="pt-1.5 text-[0.9375rem] leading-snug text-ink-soft">
                {chore.text}
              </span>
            </Card>
          </li>
        ))}
      </ul>

      <p className="rise mt-12 max-w-3xl text-[clamp(1.375rem,2.8vw,1.875rem)] leading-[1.25] font-extrabold tracking-[-0.03em]">
        Existing platforms show you listings.{" "}
        <span className="text-brand">They don&rsquo;t help you decide.</span>
      </p>
    </Section>
  );
}

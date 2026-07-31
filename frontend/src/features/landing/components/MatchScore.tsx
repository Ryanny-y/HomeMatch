import { PiSparkle } from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { CriteriaList } from "@/components/product/CriteriaList";
import { ScoreRing } from "@/components/product/ScoreRing";
import { Card, Pill } from "@/components/ui/Card";
import { Eyebrow, Lede, Section, SectionHeading } from "@/components/ui/Section";
import { SAMPLE_CRITERIA, SAMPLE_UNIT } from "@/lib/sample-listing";

export function MatchScore() {
  return (
    <Section id="match-score" labelledBy="match-score-heading">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Eyebrow icon={PiSparkle}>AI match score</Eyebrow>
          <SectionHeading id="match-score-heading">
            A score out of 100, and the reasons behind every point of it.
          </SectionHeading>

          <Lede>
            Every listing is scored against your profile, not against some
            general idea of a good apartment. The same unit can be a 94 for you
            and a 61 for someone with a different budget, commute, or household.
          </Lede>

          <p className="mt-4 max-w-2xl text-lg leading-[1.6] text-ink-muted">
            And it shows you the downsides. A listing that scores well despite a
            real problem will say so, in the same list, at the same size.
          </p>

          <blockquote className="mt-8 rounded-card border-l-4 border-gold bg-gold-soft/50 py-4 pr-5 pl-5">
            <p className="text-[1.25rem] leading-[1.35] font-bold tracking-[-0.02em] text-ink">
              Scores you can argue with are more useful than scores you
              can&rsquo;t see.
            </p>
          </blockquote>
        </Reveal>

        {/* The ring sweeps on its own as this scrolls in, so the card does not
            also need the section entrance underneath it. */}
        <Card className="p-7 sm:p-8">
          <div className="flex items-center gap-5">
            <ScoreRing score={SAMPLE_UNIT.matchScore} size="lg" />
            <div className="min-w-0">
              <Pill className="bg-gold-soft text-gold-ink">Excellent match</Pill>
              <h3 className="mt-2.5 text-lg font-extrabold tracking-[-0.03em]">
                {SAMPLE_UNIT.unitType}
              </h3>
              <p className="text-[0.875rem] text-ink-muted">
                {SAMPLE_UNIT.barangay}
              </p>
            </div>
          </div>

          <div className="mt-7 border-t border-line pt-6">
            <CriteriaList items={SAMPLE_CRITERIA} />
          </div>

          <p className="mt-6 rounded-chip bg-surface-sunken px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-muted">
            Each line traces back to a stored field on the listing. The rules
            engine decides the score; the AI only writes the sentence.
          </p>
        </Card>
      </div>
    </Section>
  );
}

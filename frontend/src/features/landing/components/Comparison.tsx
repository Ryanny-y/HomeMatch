import { PiScales, PiSparkleFill } from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { CriteriaList } from "@/components/product/CriteriaList";
import { Card, Pill } from "@/components/ui/Card";
import { Eyebrow, Lede, Section, SectionHeading } from "@/components/ui/Section";
import { peso } from "@/lib/format";
import { SAMPLE_COMPARISON } from "@/lib/sample-listing";

export function Comparison() {
  const [unitA, unitB] = SAMPLE_COMPARISON;
  const cheaper = unitA.trueCost <= unitB.trueCost ? unitA : unitB;

  return (
    <Section id="comparison" labelledBy="comparison-heading">
      <Reveal className="max-w-3xl">
        <Eyebrow icon={PiScales}>AI comparison</Eyebrow>
        <SectionHeading id="comparison-heading">
          Shortlisting is easy. Choosing is the hard part.
        </SectionHeading>
        <Lede>
          By the time you have two places you genuinely like, no amount of extra
          browsing helps. Put them side by side and HomeMatch lays out what each
          one actually costs you — in pesos, in minutes, and in the things you
          give up.
        </Lede>
      </Reveal>

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        {SAMPLE_COMPARISON.map((unit) => {
          const isCheaper = unit.name === cheaper.name;

          return (
            <Card key={unit.name} className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-ink-muted">
                    {unit.name}
                  </p>
                  <h3 className="mt-1.5 text-xl font-extrabold tracking-[-0.03em]">
                    {unit.location}
                  </h3>
                </div>
                {isCheaper ? (
                  <Pill className="bg-brand-soft text-brand-dark">
                    Lower all-in
                  </Pill>
                ) : null}
              </div>

              <div className="mt-5 flex items-baseline justify-between gap-3 rounded-chip bg-surface-sunken px-4 py-3">
                <span className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-ink-muted">
                  True monthly cost
                </span>
                <span
                  data-figure=""
                  className="text-lg font-bold tracking-[-0.02em]"
                >
                  {peso(unit.trueCost)}
                </span>
              </div>

              <CriteriaList items={unit.points} className="mt-5" />
            </Card>
          );
        })}
      </div>

      <Reveal className="mt-5">
        <Card tone="brand" className="p-6 sm:p-8">
        <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-brand-dark">
          <PiSparkleFill aria-hidden="true" className="h-4 w-4" />
          Trade-off summary
        </p>
        <p className="mt-4 max-w-3xl text-[1.0625rem] leading-[1.6] text-ink-soft">
          Unit A is ₱4,000 cheaper every month and cuts 17 minutes off each
          rush-hour trip. Unit B spends that difference on a newer building, a
          gym, and utilities you won&rsquo;t be billed for separately. If you
          make that commute daily, the time is worth more than the amenities —
          unless carrying groceries up without an elevator is a dealbreaker.
        </p>
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
          Written by the AI from both listings&rsquo; stored fields. It cannot
          cite anything that isn&rsquo;t recorded on the unit.
        </p>
        </Card>
      </Reveal>
    </Section>
  );
}

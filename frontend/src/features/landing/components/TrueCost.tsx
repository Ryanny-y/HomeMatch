import { PiCalculator } from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { COST_CATEGORY } from "@/components/product/cost-category";
import {
  CompositionBar,
  Statement,
  StatementFootnote,
  StatementGap,
  StatementRow,
  StatementTotal,
} from "@/components/product/CostStatement";
import { Card } from "@/components/ui/Card";
import { Eyebrow, Lede, Section, SectionHeading } from "@/components/ui/Section";
import { peso } from "@/lib/format";
import { SAMPLE_UNIT } from "@/lib/sample-listing";

export function TrueCost() {
  return (
    <Section id="true-cost" tone="surface" labelledBy="true-cost-heading">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* No `<Reveal>` on this card. It carries the focal sequence, and a
            fade-up underneath a bar that is already drawing itself muddies
            both. The pieces inside it stage themselves. */}
        <Card tone="sunken" className="order-2 p-6 sm:p-8 lg:order-1">
          <p className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-ink-muted">
            {SAMPLE_UNIT.barangay} · {SAMPLE_UNIT.unitType}
          </p>

          <Statement className="mt-5">
            <CompositionBar
              lines={SAMPLE_UNIT.costLines}
              total={SAMPLE_UNIT.trueMonthlyCost}
              reveal="view"
            />

            {/* The bar's legend. Each swatch is the category's own colour, so
                the chart reads without a separate key. */}
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {SAMPLE_UNIT.costLines.map((line) => (
                <li
                  key={line.category}
                  className="flex items-center gap-1.5 text-[0.75rem] text-ink-muted"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${COST_CATEGORY[line.category].fill}`}
                  />
                  {COST_CATEGORY[line.category].label}
                </li>
              ))}
            </ul>

            <dl className="mt-6 divide-y divide-line border-t border-line">
              {SAMPLE_UNIT.costLines.map((line) => (
                <StatementRow
                  key={line.category}
                  line={line}
                  total={SAMPLE_UNIT.trueMonthlyCost}
                />
              ))}
              <StatementTotal
                label="True monthly cost"
                amount={SAMPLE_UNIT.trueMonthlyCost}
                size="lg"
                countFrom={SAMPLE_UNIT.advertisedRent}
                reveal="view"
              />
            </dl>

            <StatementGap
              advertised={SAMPLE_UNIT.advertisedRent}
              trueCost={SAMPLE_UNIT.trueMonthlyCost}
              reveal="view"
            />
          </Statement>

          <StatementFootnote>
            Move-in cost covers non-refundable items only — agent&rsquo;s fee,
            moving, and basic fit-out. Your deposit is not amortised here,
            because you get it back.
          </StatementFootnote>
        </Card>

        <Reveal className="order-1 lg:order-2">
          <Eyebrow icon={PiCalculator}>True monthly cost</Eyebrow>
          <SectionHeading id="true-cost-heading">
            Rent is not the price.
          </SectionHeading>

          <Lede>
            A listing advertises one number. You pay six. Parking, electricity
            and water, internet, association dues, and the money you spend just
            to get through the door all arrive on the same salary as the rent.
          </Lede>

          <p className="mt-4 max-w-2xl text-lg leading-[1.6] text-ink-muted">
            HomeMatch itemises every one of them and amortises the move-in cost
            across your first year, so two apartments can finally be compared on
            the number that actually leaves your account.
          </p>

          <Card tone="brand" className="mt-8 p-5">
            <p className="text-[1.0625rem] leading-snug">
              This unit is advertised at{" "}
              <strong className="font-bold" data-figure="">
                {peso(SAMPLE_UNIT.advertisedRent)}
              </strong>
              . It costs{" "}
              <strong className="font-bold text-danger" data-figure="">
                {peso(SAMPLE_UNIT.trueMonthlyCost)}
              </strong>
              . That gap is the difference between comfortable and stretched,
              and most renters only find it after they&rsquo;ve signed.
            </p>
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}

import { PiMapPinLine, PiShieldCheck, PiSparkle } from "react-icons/pi";

import {
  CompositionBar,
  Statement,
  StatementGap,
  StatementRow,
  StatementTotal,
} from "@/components/product/CostStatement";
import { ScoreRing } from "@/components/product/ScoreRing";
import { ButtonLink } from "@/components/ui/Button";
import { Card, Pill } from "@/components/ui/Card";
import { Container, Eyebrow } from "@/components/ui/Section";
import { SAMPLE_UNIT } from "@/lib/sample-listing";
import { SIGNUP_LANDLORD, SIGNUP_RENTER } from "@/lib/site";

/**
 * The hero pairs the promise with the evidence: the claim on the left, and on
 * the right a real scored listing card showing what the product actually
 * outputs. The card is static demo UI — it does not call the API.
 *
 * It is also where the page's one authored moment plays. Everything here is
 * triggered by `load` rather than by scroll, because the card is on screen at
 * first paint and a view-driven trigger would simply never fire: the ring
 * sweeps to 94, the bar wipes in rent-first, the total climbs from the
 * advertised ₱22,000 to what the unit really costs, and the gap callout lands
 * once the number has stopped. The same sequence repeats exactly once more, in
 * the true-cost section, and nowhere else on the page.
 */
function HeroListingCard() {
  const topLines = SAMPLE_UNIT.costLines.slice(0, 3);

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Pill className="bg-brand-soft text-brand-dark">
            <PiShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            Verified
          </Pill>
          <h3 className="mt-3 text-xl font-extrabold tracking-[-0.03em]">
            {SAMPLE_UNIT.unitType}
          </h3>
          <p className="mt-1 flex items-start gap-1.5 text-[0.875rem] leading-snug text-ink-muted">
            <PiMapPinLine aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {SAMPLE_UNIT.barangay}, {SAMPLE_UNIT.city}
            </span>
          </p>
        </div>

        <ScoreRing score={SAMPLE_UNIT.matchScore} trigger="load" />
      </div>

      <Statement className="mt-6 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-ink-muted">
            What it really costs
          </p>
          <p className="text-[0.8125rem] text-ink-muted">
            Rent is{" "}
            <span data-figure="" className="font-semibold text-ink">
              64%
            </span>{" "}
            of it
          </p>
        </div>

        <div className="mt-3">
          <CompositionBar
            lines={SAMPLE_UNIT.costLines}
            total={SAMPLE_UNIT.trueMonthlyCost}
            reveal="load"
          />
        </div>

        <dl className="mt-3 divide-y divide-line">
          {topLines.map((line) => (
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
            reveal="load"
          />
        </dl>

        <StatementGap
          advertised={SAMPLE_UNIT.advertisedRent}
          trueCost={SAMPLE_UNIT.trueMonthlyCost}
          reveal="load"
        />
      </Statement>
    </Card>
  );
}

const TRUST_POINTS = [
  { icon: PiShieldCheck, text: "Hand-verified listings, never scraped" },
  { icon: PiSparkle, text: "Every score explained in plain language" },
];

export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="pt-12 pb-20 sm:pt-16 sm:pb-24"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
          <div>
            <Eyebrow icon={PiMapPinLine}>Quezon City · Metro Manila</Eyebrow>

            {/* Sized so the first clause fits the column on one line. At the
                previous scale it broke into four ragged lines with "not just"
                stranded on its own. */}
            <h1
              id="hero-heading"
              className="mt-6 text-[clamp(2.125rem,4vw,3rem)] leading-[1.08]"
            >
              Find the{" "}
              <span className="relative whitespace-nowrap text-brand">
                right home
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-0.5 h-[0.1em] rounded-full bg-gold"
                />
              </span>
              , not just another listing.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-[1.6] text-ink-muted">
              HomeMatch scores every apartment against your budget, commute, and
              lifestyle, then shows the true monthly cost — not just the rent.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={SIGNUP_RENTER} size="lg">
                Find my match
              </ButtonLink>
              <ButtonLink href={SIGNUP_LANDLORD} size="lg" variant="secondary">
                List your property
              </ButtonLink>
            </div>

            <ul className="mt-8 space-y-2.5">
              {TRUST_POINTS.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2.5 text-[0.9375rem] text-ink-muted"
                >
                  <Icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem] shrink-0 text-brand" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <HeroListingCard />
        </div>
      </Container>
    </section>
  );
}

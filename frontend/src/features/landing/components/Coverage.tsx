import Image from "next/image";
import { PiMapPinLine, PiShieldCheck } from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { Card, IconBadge } from "@/components/ui/Card";
import { Eyebrow, Lede, Section, SectionHeading } from "@/components/ui/Section";

/**
 * Honest status, in place of social proof. There are no user counts, star
 * ratings, or testimonials on this page because there is nothing real to
 * report yet — and inventing them would contradict a product whose entire
 * pitch is that its numbers can be checked.
 */
export function Coverage() {
  return (
    <Section id="coverage" labelledBy="coverage-heading">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Eyebrow icon={PiMapPinLine}>Where we are</Eyebrow>
          <SectionHeading id="coverage-heading">
            Quezon City first, and only what we can verify.
          </SectionHeading>

          <Lede>
            Version one covers Quezon City. Expansion across the rest of Metro
            Manila is planned, and we would rather be genuinely useful in one
            city than thin across five.
          </Lede>

          <p className="mt-4 max-w-2xl text-lg leading-[1.6] text-ink-muted">
            Listings are hand-verified, not scraped. Every unit is checked by a
            person, its cost fields are filled in by hand, and units that
            can&rsquo;t be confirmed don&rsquo;t go up.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card className="flex items-center gap-3.5 p-4">
              <IconBadge icon={PiMapPinLine} tone="onSurface" size="sm" />
              <div>
                <p className="font-mono text-[0.625rem] font-medium tracking-[0.08em] uppercase text-ink-muted">
                  Live coverage
                </p>
                <p className="text-[0.9375rem] font-bold">Quezon City</p>
              </div>
            </Card>

            <Card className="flex items-center gap-3.5 p-4">
              <IconBadge icon={PiShieldCheck} tone="onSurface" size="sm" />
              <div>
                <p className="font-mono text-[0.625rem] font-medium tracking-[0.08em] uppercase text-ink-muted">
                  Listing source
                </p>
                <p className="text-[0.9375rem] font-bold">Hand-verified</p>
              </div>
            </Card>
          </div>
        </Reveal>

        <Reveal>
          <Card className="overflow-hidden p-2">
            <Image
              src="/coverage-quezon-city.svg"
              alt="Diagram of HomeMatch AI's coverage area. Quezon City is outlined as live, with Trinoma, UP Diliman, Katipunan and Ateneo, Cubao, and Eastwood marked inside it. A dashed boundary around the rest of Metro Manila is labelled as planned expansion."
              width={640}
              height={460}
              className="h-auto w-full rounded-[0.625rem]"
            />
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}

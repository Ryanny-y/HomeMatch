import { PiCheckCircleFill, PiSparkle, PiXCircleFill } from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow, Lede, Section, SectionHeading } from "@/components/ui/Section";

/**
 * The positioning statement, set as two questions facing each other. The
 * competitor's question is rendered quiet and the product's question loud,
 * because that difference is the entire argument.
 */
export function Solution() {
  return (
    <Section id="solution" tone="deep" labelledBy="solution-heading">
      <Reveal className="max-w-3xl">
        <Eyebrow icon={PiSparkle} onDark>
          The difference
        </Eyebrow>
        <SectionHeading id="solution-heading" className="text-white">
          Two platforms can show the same apartment and still be answering
          completely different questions.
        </SectionHeading>
      </Reveal>

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="rounded-card border border-white/15 p-7">
          <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-white/55">
            <PiXCircleFill aria-hidden="true" className="h-4 w-4" />
            Other platforms ask
          </p>
          <p className="mt-4 text-[clamp(1.375rem,2.6vw,1.875rem)] leading-[1.2] font-extrabold tracking-[-0.03em] text-white/60">
            &ldquo;What apartments exist?&rdquo;
          </p>
        </div>

        <div className="rounded-card border border-gold/50 bg-white/[0.07] p-7">
          <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-gold">
            <PiCheckCircleFill aria-hidden="true" className="h-4 w-4" />
            HomeMatch AI asks
          </p>
          <p className="mt-4 text-[clamp(1.375rem,2.6vw,1.875rem)] leading-[1.2] font-extrabold tracking-[-0.03em] text-white">
            &ldquo;Which apartment is best for you?&rdquo;
          </p>
        </div>
      </div>

      <Lede onDark className="mt-12 max-w-3xl">
        You start with a profile: your budget, where you work or study, how you
        get there, whether you have pets, whether you need parking, and how many
        people are moving in. That profile feeds a scoring engine that compares
        it against the real fields on every listing — cost, commute times,
        barangay, building rules. Then every result is explained in plain
        language, including the parts you won&rsquo;t like.
      </Lede>
    </Section>
  );
}

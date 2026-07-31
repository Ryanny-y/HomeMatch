import Link from "next/link";
import { PiCaretRight, PiPlus, PiQuestion } from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/Card";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/Section";
import { FAQ } from "@/features/landing/faq";

/**
 * Built on native <details>/<summary>. It is keyboard-operable, works with the
 * page's find-in-page, survives JavaScript failing to load, and needs no ARIA
 * bookkeeping — all of which a hand-rolled accordion would have to earn back.
 */
export function Faq() {
  return (
    <Section id="faq" tone="surface" labelledBy="faq-heading">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <Reveal>
          <Eyebrow icon={PiQuestion}>Questions</Eyebrow>
          <SectionHeading id="faq-heading">
            The things worth asking before you sign up.
          </SectionHeading>
        </Reveal>

        <div className="space-y-3">
          {FAQ.map((entry) => (
            <Card key={entry.question} tone="sunken" className="group">
              <details className="disclosure group/item">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 p-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[1.0625rem] leading-snug font-bold tracking-[-0.02em] transition-colors group-open/item:text-brand-dark">
                    {entry.question}
                  </h3>
                  <PiPlus
                    aria-hidden="true"
                    className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-ink-muted transition-transform duration-[var(--dur-move)] ease-arrival group-open/item:rotate-45"
                  />
                </summary>

                <div className="px-5 pb-5">
                  <p className="leading-[1.65] text-ink-muted">{entry.answer}</p>
                  {entry.link ? (
                    <Link
                      href={entry.link.href}
                      className="group/link mt-3 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-brand transition-colors hover:text-brand-dark"
                    >
                      {entry.link.label}
                      <PiCaretRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 transition-transform duration-[var(--dur-state)] ease-arrival motion-safe:group-hover/link:translate-x-0.5"
                      />
                    </Link>
                  ) : null}
                </div>
              </details>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
}

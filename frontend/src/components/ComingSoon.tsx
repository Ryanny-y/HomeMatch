import type { IconType } from "react-icons";
import { PiWrench } from "react-icons/pi";

import { ButtonLink } from "@/components/ui/Button";
import { Card, IconBadge } from "@/components/ui/Card";
import { Container } from "@/components/ui/Section";

/**
 * Placeholder shell for routes that exist but aren't built yet.
 *
 * These are reachable from the landing page, so they have to resolve to
 * something honest rather than a 404 — but they must never look like working
 * UI either. No fake charts, no empty tables, no disabled buttons implying a
 * feature is one click away: just what the screen will do, and where to go
 * meanwhile.
 */
export function ComingSoon({
  eyebrow,
  title,
  description,
  icon = PiWrench,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon?: IconType;
  action?: { label: string; href: string };
}) {
  return (
    <main id="main" className="flex flex-1 items-center py-20 sm:py-28">
      <Container>
        <Card className="mx-auto max-w-2xl p-8 sm:p-10">
          <IconBadge icon={icon} className="bg-brand-soft text-brand" />

          <p className="mt-5 font-mono text-[0.625rem] font-medium tracking-[0.1em] uppercase text-brand-dark">
            {eyebrow}
          </p>

          <h1 className="mt-2.5 text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.08]">
            {title}
          </h1>

          <p className="mt-4 text-lg leading-[1.6] text-ink-muted">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {action ? (
              <ButtonLink href={action.href} size="lg">
                {action.label}
              </ButtonLink>
            ) : null}
            <ButtonLink href="/" size="lg" variant="secondary">
              Back to home
            </ButtonLink>
          </div>
        </Card>
      </Container>
    </main>
  );
}

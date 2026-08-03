import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/**
 * One group of the profile: a heading, an optional line about how the group is
 * read, and its controls.
 *
 * The heading is small and set in the mono face rather than large and bold. The
 * page's own heading already carries the weight; these are labels on a form the
 * reader scans, and four competing display headings would flatten the h1 they
 * sit under.
 */
export function RubricGroup({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <h2
        id={id}
        className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-ink-muted uppercase"
      >
        {title}
      </h2>

      {description ? (
        <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-[1.6] text-pretty text-ink-soft">
          {description}
        </p>
      ) : null}

      <div className="mt-5">{children}</div>
    </Card>
  );
}

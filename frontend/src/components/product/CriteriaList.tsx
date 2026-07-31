import type { ReactNode } from "react";
import { PiCheckCircleFill, PiWarningCircleFill } from "react-icons/pi";

/**
 * The reasons behind a match score.
 *
 * The brief's rule — "scores you can argue with are more useful than scores you
 * can't see" — is enforced structurally: a score is never rendered without its
 * criteria, and the criterion type separates what the listing satisfies from
 * what it costs you. Tradeoffs are gold rather than red, because they aren't
 * errors; they are the honest half of the answer.
 */

export type Criterion = {
  kind: "pass" | "tradeoff";
  text: ReactNode;
};

export function CriteriaList({
  items,
  className,
}: {
  items: readonly Criterion[];
  className?: string;
}) {
  return (
    <ul className={`space-y-2.5 ${className ?? ""}`}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug">
          {item.kind === "pass" ? (
            <PiCheckCircleFill
              aria-hidden="true"
              className="mt-px h-[1.125rem] w-[1.125rem] shrink-0 text-brand"
            />
          ) : (
            <PiWarningCircleFill
              aria-hidden="true"
              className="mt-px h-[1.125rem] w-[1.125rem] shrink-0 text-gold-ink"
            />
          )}
          <span className={item.kind === "pass" ? "text-ink-soft" : "text-ink"}>
            <span className="sr-only">
              {item.kind === "pass" ? "Meets your profile: " : "Tradeoff: "}
            </span>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

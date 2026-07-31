"use client";

import { useCountUp } from "@/hooks/useCountUp";
import type { CountTrigger } from "@/hooks/useCountUp";
import { peso } from "@/lib/format";
import { COUNT_DELAY, writeText } from "@/lib/motion";

/**
 * A peso figure that travels from the number a listing advertises to the number
 * the unit actually costs.
 *
 * This is the page's one authored moment, and it only works because the two
 * values are real: the count starts at the advertised rent and stops at the
 * true monthly cost, so the distance the digits travel is exactly the gap the
 * product exists to surface. Given any other pair of numbers it would be a
 * gimmick, which is why `from` is required rather than defaulting to zero.
 *
 * The final value is what renders on the server and what a reader with reduced
 * motion — or no JavaScript — sees. `tabular-nums` comes from `[data-figure]`,
 * so the width never twitches while the digits change.
 */
export function CountUpFigure({
  from,
  to,
  trigger = "view",
  delay = COUNT_DELAY,
  className,
}: {
  from: number;
  to: number;
  trigger?: CountTrigger;
  delay?: number;
  className?: string;
}) {
  const ref = useCountUp<HTMLSpanElement>({
    from,
    to,
    trigger,
    delay,
    onFrame: (value, element) => {
      writeText(element, peso(Math.round(value)));
    },
  });

  return (
    <span ref={ref} data-figure="" className={className}>
      {peso(to)}
    </span>
  );
}

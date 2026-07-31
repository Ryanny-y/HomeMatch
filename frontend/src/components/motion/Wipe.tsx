"use client";

import { m } from "motion/react";
import type { Variants } from "motion/react";
import type { ReactNode } from "react";

import { useArmedReveal } from "@/components/motion/useArmedReveal";
import { FOCAL } from "@/lib/motion";

/**
 * The focal reveal: the composition bar drawing itself left to right.
 *
 * An inset clip rather than a `scaleX`, for the same reason it was one in CSS:
 * scaling squashes all six segments together so they arrive as a single shape,
 * where a clip reveals them at their true widths. Rent genuinely lands first
 * and the five costs a listing never shows follow it — which is the argument
 * the section is making, performed instead of asserted.
 *
 * This runs in exactly one place, the true-cost card. The hero's copy of the
 * same bar is on screen at first paint and stays on CSS, where it plays without
 * waiting for a bundle.
 */

const wipe: Variants = {
  hidden: { clipPath: "inset(0 100% 0 0)" },
  shown: { clipPath: "inset(0 0 0 0)", transition: FOCAL },
};

export function Wipe({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, state } = useArmedReveal<HTMLDivElement>();

  return (
    <m.div
      ref={ref}
      className={className}
      initial={false}
      animate={state}
      variants={wipe}
    >
      {children}
    </m.div>
  );
}

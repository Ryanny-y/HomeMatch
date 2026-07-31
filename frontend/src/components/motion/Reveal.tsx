"use client";

import { m } from "motion/react";
import type { Variants } from "motion/react";
import type { ReactNode } from "react";

import { useArmedReveal } from "@/components/motion/useArmedReveal";
import { RISE, STAGGER_CAP, STAGGER_STEP } from "@/lib/motion";

/**
 * The scroll entrance, and the rule that keeps it from ever hiding the page.
 *
 * This replaced a CSS `animation-timeline: view()` implementation. That version
 * needed no JavaScript, which was genuinely better, but scroll-driven timelines
 * are still unimplemented in Firefox and only landed in Safari 26 — and the
 * fallback there was not "no animation", it was *every section animating at
 * once on load*, so a reader four screens down had already missed all of it. A
 * reveal that only fires in some browsers is not a reveal.
 *
 * ---
 *
 * WHY NOTHING HERE SETS `initial`.
 *
 * The obvious spelling — `initial="hidden"` plus `whileInView` — makes Motion
 * serialise `opacity: 0` into the server HTML. If the bundle then fails to
 * arrive, and PRODUCT.md's default reader is on mobile data where that is a
 * real event, the entire landing page is blank. Permanently. That trade is
 * unacceptable for a page whose whole job is to be read.
 *
 * So the server renders everything visible and `initial={false}` keeps it that
 * way. The hidden state is applied on the client, on mount, and *only to
 * elements below the fold* — where there is nothing to flash, because the
 * reader cannot see them. See `useArmedReveal`.
 *
 * The result degrades in the right direction at every step. No JavaScript, slow
 * JavaScript, broken JavaScript, and reduced-motion all end in the same place:
 * the content, visible.
 */

const rise: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: RISE },
};

/**
 * Children inherit the parent's variant label, so a group arms once and the
 * whole grid follows. The delay is per-item and capped, because the point of a
 * stagger is to show the items are a sequence — past the fourth it stops
 * reading as order and starts reading as lag.
 */
const staggeredRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...RISE, delay: Math.min(index, STAGGER_CAP) * STAGGER_STEP },
  }),
};

export function Reveal({
  children,
  className,
  delay,
}: {
  children: ReactNode;
  className?: string;
  /** Held back to land after something else in the same sequence, in seconds. */
  delay?: number;
}) {
  const { ref, state } = useArmedReveal<HTMLDivElement>();

  const variants: Variants = delay
    ? {
        hidden: rise.hidden,
        shown: { opacity: 1, y: 0, transition: { ...RISE, delay } },
      }
    : rise;

  return (
    <m.div
      ref={ref}
      className={className}
      initial={false}
      animate={state}
      variants={variants}
    >
      {children}
    </m.div>
  );
}

/**
 * A list whose children arrive in order. Only for collections where the order
 * carries meaning — a sequence of steps, or a pile of complaints making its
 * point by accumulating. The tag is real rather than a wrapper, because the
 * list semantics are the reason these are lists.
 */
export function RevealGroup({
  children,
  className,
  as = "ul",
}: {
  children: ReactNode;
  className?: string;
  as?: "ul" | "ol";
}) {
  const { ref, state } = useArmedReveal<HTMLUListElement & HTMLOListElement>();

  return as === "ol" ? (
    <m.ol ref={ref} className={className} initial={false} animate={state}>
      {children}
    </m.ol>
  ) : (
    <m.ul ref={ref} className={className} initial={false} animate={state}>
      {children}
    </m.ul>
  );
}

export function RevealItem({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  return (
    <m.li className={className} custom={index} variants={staggeredRise}>
      {children}
    </m.li>
  );
}

/**
 * The one place that owns motion timing in JavaScript.
 *
 * State, hover, press, and disclosure are still CSS, because CSS runs whether
 * or not the bundle arrives and none of those need a scroll position. Two
 * things do need JavaScript: a figure that has to count — CSS cannot animate a
 * number and keep it in the accessibility tree at the same time — and the
 * scroll entrances, which moved to Motion because `animation-timeline: view()`
 * still does not exist in Firefox. See `components/motion/Reveal.tsx`.
 *
 * Everything here agrees with the `--dur-*` and `--ease-*` tokens in
 * `globals.css` by hand. Neither a frame loop nor Motion can read a CSS custom
 * property, so keeping the two in sync is a maintenance cost paid deliberately,
 * in one file, rather than scattered across components.
 */

import type { Transition } from "motion/react";

/** `--ease-arrival`. Things land and stay landed. */
export const EASE_ARRIVAL = [0.16, 1, 0.3, 1] as const;

/** The quiet entrance, matching the old `rise-in` keyframes exactly. */
export const RISE: Transition = { duration: 0.42, ease: EASE_ARRIVAL };

/** `--dur-focal`. The one authored moment, and nothing else. */
export const FOCAL: Transition = { duration: 0.7, ease: EASE_ARRIVAL };

/**
 * How far up from the bottom edge an element must travel before it counts as
 * arrived. Matches the `rootMargin` in `useCountUp`, so a cost card's bar,
 * figure, and callout all start from the same scroll position and keep the
 * order the sequence was authored in.
 */
export const REVEAL_MARGIN = "0px 0px -15% 0px";

/** The same threshold as a fraction, for measuring an element directly. */
export const REVEAL_TRIGGER = 0.85;

/** Sibling stagger: 60ms apart, and never more than four steps of it. */
export const STAGGER_STEP = 0.06;
export const STAGGER_CAP = 3;

/**
 * When the gap callout lands, in seconds — a beat after the total has stopped
 * counting. Holding it back is the whole point: shown at the same moment as the
 * number, it reads as part of the card's furniture rather than as the
 * conclusion the card was building to.
 */
export const GAP_DELAY = 0.9;

/** How long a figure takes to travel from its opening value to its real one. */
export const COUNT_DURATION = 700;

/**
 * The figure follows the composition bar rather than racing it. The bar answers
 * "what is this made of" and the total answers "so what does it come to" — in
 * that order, or the sequence is just three things happening at once.
 */
export const COUNT_DELAY = 300;

/**
 * Rewrites an element's text in place.
 *
 * `element.textContent = …` discards the existing text node and builds a new
 * one, which at sixty frames a second is a lot of garbage to make just to move
 * a number. Writing `nodeValue` edits the node React already put there.
 */
export function writeText(element: Element, text: string): void {
  const node = element.firstChild;

  if (node instanceof Text) {
    node.nodeValue = text;
    return;
  }

  element.textContent = text;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The same exponential deceleration as `--ease-arrival`. A counting figure has
 * to land: most of the distance is covered early, and the final pesos settle
 * slowly enough to be read.
 */
export function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Runs `onFrame` with an eased value from `from` to `to`, then once more with
 * exactly `to` so the figure never rests on a rounding artefact.
 *
 * Returns a cancel function. Callers must call it on unmount — a stray frame
 * loop writing into a detached node is a leak that no test will catch.
 */
export function animateValue({
  from,
  to,
  duration = COUNT_DURATION,
  delay = 0,
  onFrame,
}: {
  from: number;
  to: number;
  duration?: number;
  delay?: number;
  onFrame: (value: number) => void;
}): () => void {
  let frame = 0;
  const start = performance.now() + delay;

  const tick = (now: number): void => {
    // Frames during the delay still repaint the opening value, which is what
    // the server already rendered — nothing flickers while the figure waits.
    const progress = Math.min(Math.max(now - start, 0) / duration, 1);
    onFrame(from + (to - from) * easeOutExpo(progress));

    if (progress < 1) {
      frame = requestAnimationFrame(tick);
      return;
    }

    onFrame(to);
  };

  frame = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(frame);
}

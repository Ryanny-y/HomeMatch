/**
 * The one place that owns time-based animation in JavaScript.
 *
 * Almost all motion on this site is CSS, because CSS runs whether or not the
 * bundle arrives. The exception is a figure that has to count — CSS cannot
 * animate a number and keep it in the accessibility tree at the same time — so
 * this module exists for that and nothing else.
 *
 * The durations agree with the `--dur-*` tokens in `globals.css` by hand. A
 * count is driven by `requestAnimationFrame` rather than by a CSS timeline, so
 * it cannot read the token; keeping the two in sync is a maintenance cost paid
 * deliberately, in one file, rather than scattered across components.
 */

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

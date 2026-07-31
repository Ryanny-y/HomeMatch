"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { animateValue, prefersReducedMotion } from "@/lib/motion";

/**
 * `load` — start on mount. For figures that are already on screen at first
 * paint, where a scroll trigger would simply never fire.
 * `view` — start the first time the element is scrolled into view, once.
 * `none` — never animate. The figure is furniture on this screen.
 */
export type CountTrigger = "load" | "view" | "none";

type CountUpOptions<T extends Element> = {
  from: number;
  to: number;
  trigger?: CountTrigger;
  duration?: number;
  /** Held back so this figure can follow another part of the sequence. */
  delay?: number;
  /** Called on every frame with the current value and the mounted element. */
  onFrame: (value: number, element: T) => void;
};

/**
 * Counts a figure from one value to another and hands each frame back to the
 * caller, which writes it into the DOM itself.
 *
 * Writing imperatively rather than through state is the point: sixty renders a
 * second to move one number would be absurd, and the server already rendered
 * the final value. That is also what makes this safe — the markup is correct
 * before this hook runs and stays correct if it never does, so a failed bundle
 * costs the animation and nothing else.
 */
export function useCountUp<T extends Element>({
  from,
  to,
  trigger = "view",
  duration,
  delay,
  onFrame,
}: CountUpOptions<T>): RefObject<T | null> {
  const ref = useRef<T>(null);

  // Held in a ref so a caller can pass an inline closure without restarting the
  // count on every render. Declared before the effect below so the latest
  // callback is always in place by the time a frame can fire.
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const element = ref.current;
    if (!element || trigger === "none") return;
    if (prefersReducedMotion()) return;

    let cancel: (() => void) | undefined;

    const run = (): void => {
      cancel = animateValue({
        from,
        to,
        duration,
        delay,
        onFrame: (value) => onFrameRef.current(value, element),
      });
    };

    if (trigger === "load" || typeof IntersectionObserver === "undefined") {
      run();
      return () => cancel?.();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        run();
      },
      // Waits until the figure is properly on screen rather than clipping the
      // start of the count against the bottom edge.
      { rootMargin: "0px 0px -15% 0px" },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancel?.();
    };
  }, [from, to, trigger, duration, delay]);

  return ref;
}

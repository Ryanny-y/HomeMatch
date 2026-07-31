"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { REVEAL_MARGIN, REVEAL_TRIGGER } from "@/lib/motion";

/**
 * Decides whether an element should play its entrance, and refuses to hide
 * anything the reader can already see.
 *
 * The full reasoning — why nothing here serialises a hidden state into the
 * server HTML — is in `Reveal.tsx`. The short version: the page must survive a
 * bundle that never arrives, so the hidden state is applied on the client and
 * only below the fold, where there is nothing to flash.
 */
export function useArmedReveal<T extends Element>(): {
  ref: RefObject<T | null>;
  state: "hidden" | "shown";
} {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  const [armed, setArmed] = useState(false);
  const inView = useInView(ref, { once: true, margin: REVEAL_MARGIN });

  useEffect(() => {
    if (reduced) return;

    const element = ref.current;
    if (!element) return;

    // The same threshold the observer uses, so an element is never armed and
    // then released in the same breath — that would animate something the
    // reader is already looking at.
    if (element.getBoundingClientRect().top < window.innerHeight * REVEAL_TRIGGER) {
      return;
    }

    setArmed(true);
  }, [reduced]);

  return { ref, state: armed && !inView ? "hidden" : "shown" };
}

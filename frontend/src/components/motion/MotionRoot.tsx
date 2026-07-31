"use client";

import { domAnimation, LazyMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Supplies Motion's feature set to everything below it.
 *
 * `domAnimation` rather than the full bundle, and `m.*` rather than `motion.*`:
 * the complete `motion` component pulls in drag and layout projection, neither
 * of which this site uses, and PRODUCT.md's default reader is on a mid-range
 * Android over mobile data. `strict` makes that a build-time contract instead
 * of a convention — importing `motion.div` anywhere under this provider throws
 * rather than silently doubling the bundle.
 *
 * This deliberately wraps the landing page alone. The auth screens have no
 * scroll reveals, so they ship none of this.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

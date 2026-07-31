"use client";

import { useRef } from "react";

import { useCountUp } from "@/hooks/useCountUp";
import type { CountTrigger } from "@/hooks/useCountUp";
import { writeText } from "@/lib/motion";

/**
 * The match score, drawn as an arc against its own denominator.
 *
 * It sweeps from zero to the score rather than appearing at it. That is the
 * only thing that makes "out of 100" visible: you watch the gold cover most of
 * the track and stop short, and the six points it did not earn are the part
 * this product refuses to hide. Both halves — arc and numeral — are driven from
 * one frame loop, so the digit and the sweep can never disagree.
 *
 * The server renders the finished state. Without JavaScript, or with reduced
 * motion, the ring is simply already at 94.
 */

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function offsetFor(value: number): string {
  return String(CIRCUMFERENCE * (1 - value / 100));
}

export function ScoreRing({
  score,
  label = "Match",
  size = "md",
  trigger = "view",
}: {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  trigger?: CountTrigger;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const box = { sm: "h-20 w-20", md: "h-28 w-28", lg: "h-32 w-32" }[size];
  const figure = { sm: "text-xl", md: "text-3xl", lg: "text-4xl" }[size];

  const arcRef = useRef<SVGCircleElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  const rootRef = useCountUp<HTMLDivElement>({
    from: 0,
    to: clamped,
    trigger,
    onFrame: (value) => {
      arcRef.current?.setAttribute("stroke-dashoffset", offsetFor(value));
      if (valueRef.current) writeText(valueRef.current, String(Math.round(value)));
    },
  });

  return (
    <div ref={rootRef} className={`relative ${box} shrink-0`}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          className="text-line"
        />
        <circle
          ref={arcRef}
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offsetFor(clamped)}
          className="text-gold"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          ref={valueRef}
          data-figure=""
          className={`font-bold tracking-[-0.04em] text-ink ${figure}`}
        >
          {clamped}
        </span>
        <span className="font-mono text-[0.5625rem] font-medium tracking-[0.12em] uppercase text-ink-muted">
          {label}
        </span>
      </div>
    </div>
  );
}

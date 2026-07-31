import type { CSSProperties, ReactNode } from "react";
import { PiWarningCircleFill } from "react-icons/pi";

import { Reveal } from "@/components/motion/Reveal";
import { Wipe } from "@/components/motion/Wipe";
import { COST_CATEGORY } from "@/components/product/cost-category";
import { CountUpFigure } from "@/components/product/CountUpFigure";
import type { CountTrigger } from "@/hooks/useCountUp";
import { peso } from "@/lib/format";
import { GAP_DELAY } from "@/lib/motion";
import type { CostLine } from "@/lib/sample-listing";

/**
 * The true-cost breakdown — the page's signature object.
 *
 * The composition bar is the whole argument in one row: rent is only ~64% of
 * what the unit actually costs, and the remaining third is the part listings
 * never show. Each segment's colour matches the dot on its line below, so the
 * bar and the list are two readings of the same data rather than a chart and
 * a table that happen to sit together.
 *
 * That equivalence is also what the motion is for. Wrapped in `<Statement>`,
 * the pieces assemble in the order the money arrives — bar, then total, then
 * the gap — and hovering any line dims every bar segment but its own. See the
 * motion block in `globals.css`; the timings belong there, not here.
 */

/**
 * Where a statement's motion is triggered from. `load` is for a statement that
 * is already on screen at first paint; `view` waits for the scroll; `none` is
 * for screens where the card is supporting furniture rather than the argument.
 */
export type StatementReveal = "load" | "view" | "none";

const COUNT_TRIGGER: Record<StatementReveal, CountTrigger> = {
  load: "load",
  view: "view",
  none: "none",
};

function percentOf(amount: number, total: number): number {
  return (amount / total) * 100;
}

/**
 * Groups a bar with its itemised lines. Only needed where both are present —
 * it is what lets a hovered line find its own segment, and it costs one div.
 */
export function Statement({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`statement ${className ?? ""}`}>{children}</div>
  );
}

const BAR = "flex h-3 w-full gap-0.5 overflow-hidden rounded-full";

export function CompositionBar({
  lines,
  total,
  reveal = "view",
}: {
  lines: readonly CostLine[];
  total: number;
  reveal?: StatementReveal;
}) {
  const segments = lines.map((line) => (
    <span
      key={line.category}
      data-seg={line.category}
      // A segment's width is its share of the total, which is only known at
      // runtime — so the value rides in on a custom property and `w-(--…)`
      // stays the declaration, as Tailwind prescribes for dynamic values.
      className={`w-(--share) ${COST_CATEGORY[line.category].fill} first:rounded-l-full last:rounded-r-full`}
      style={{ "--share": `${percentOf(line.amount, total)}%` } as CSSProperties}
    />
  ));

  // The scroll-triggered copy needs a real observer; the one that plays on load
  // is already on screen and stays on CSS, so it runs without a bundle.
  if (reveal === "view") {
    return <Wipe className={BAR}>{segments}</Wipe>;
  }

  return (
    <div className={`${BAR} ${reveal === "load" ? "wipe-load" : ""}`}>
      {segments}
    </div>
  );
}

export function StatementRow({
  line,
  total,
}: {
  line: CostLine;
  /** When supplied, the row shows what share of the total it represents. */
  total?: number;
}) {
  const category = COST_CATEGORY[line.category];

  return (
    <div data-row={line.category} className="flex items-center gap-3 py-2.5">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${category.fill}`}
      />

      <dt className="min-w-0 flex-1">
        <span className="text-[0.9375rem] font-medium text-ink">
          {line.label}
        </span>
        {line.note ? (
          <span className="block text-[0.8125rem] leading-snug text-ink-muted">
            {line.note}
          </span>
        ) : null}
      </dt>

      <dd className="shrink-0 text-right">
        <span data-figure="" className="text-[0.9375rem] font-medium text-ink">
          {peso(line.amount)}
        </span>
        {total ? (
          <span
            data-figure=""
            className="block text-[0.75rem] leading-snug text-ink-faint"
          >
            {Math.round(percentOf(line.amount, total))}%
          </span>
        ) : null}
      </dd>
    </div>
  );
}

export function StatementTotal({
  label,
  amount,
  size = "md",
  countFrom,
  reveal = "view",
}: {
  label: string;
  amount: number;
  size?: "md" | "lg";
  /**
   * The advertised rent. Supplying it makes the total count up from the number
   * the listing shows to the number the unit costs — the distance between them
   * is the point, so this is only ever the real advertised figure.
   */
  countFrom?: number;
  reveal?: StatementReveal;
}) {
  const figureClass = `font-bold tracking-[-0.03em] ${
    size === "lg" ? "text-[clamp(1.5rem,3.6vw,2.125rem)]" : "text-xl"
  }`;

  return (
    <div className="mt-3 flex items-center justify-between gap-4 rounded-chip bg-ink px-4 py-3.5 text-white">
      <dt className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-white/70">
        {label}
      </dt>
      <dd>
        {countFrom === undefined || reveal === "none" ? (
          <span data-figure="" className={figureClass}>
            {peso(amount)}
          </span>
        ) : (
          <CountUpFigure
            from={countFrom}
            to={amount}
            trigger={COUNT_TRIGGER[reveal]}
            className={figureClass}
          />
        )}
      </dd>
    </div>
  );
}

/**
 * The gap callout — the number this page exists to surface, and the only place
 * the danger tone is used on the landing page.
 *
 * It arrives after the total has finished counting. Shown at the same moment it
 * would read as part of the card; held back, it reads as the conclusion.
 */
export function StatementGap({
  advertised,
  trueCost,
  reveal = "view",
}: {
  advertised: number;
  trueCost: number;
  reveal?: StatementReveal;
}) {
  const difference = trueCost - advertised;
  const percent = Math.round((difference / advertised) * 100);

  const callout = (
    <p
      className={`mt-3 flex items-start gap-2.5 rounded-chip border border-danger-line bg-danger-soft px-3.5 py-3 text-[0.875rem] leading-snug text-ink ${
        reveal === "load" ? "land-late-load" : ""
      }`}
    >
      <PiWarningCircleFill
        aria-hidden="true"
        className="mt-px h-[1.125rem] w-[1.125rem] shrink-0 text-danger"
      />
      <span>
        <strong className="font-semibold text-danger">
          <span data-figure="">{peso(difference)} more</span>
        </strong>{" "}
        than the advertised rent — {percent}% above the number in the listing.
      </span>
    </p>
  );

  return reveal === "view" ? (
    <Reveal delay={GAP_DELAY}>{callout}</Reveal>
  ) : (
    callout
  );
}

export function StatementFootnote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
      {children}
    </p>
  );
}

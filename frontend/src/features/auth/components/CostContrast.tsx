import type { CSSProperties } from "react";

import { peso } from "@/lib/format";
import { SAMPLE_UNIT } from "@/lib/sample-listing";

/**
 * The true-cost argument, reduced to the one comparison it rests on.
 *
 * The landing page states this as a six-category breakdown, and there the six
 * hues are load-bearing: each one is bound to a cost line, and the bar and the
 * itemised list are two readings of the same record. None of that is true on an
 * auth screen. Nobody is reading a cost table while they type a password, so
 * the chart was contributing six colours and no information.
 *
 * What survives is the claim itself — one advertised figure, one real figure,
 * and the split between them. Two tones, both already in the page: ink for the
 * number a listing shows you, brand for the part it doesn't.
 */
export function CostContrast() {
  const rentShare = Math.round(
    (SAMPLE_UNIT.advertisedRent / SAMPLE_UNIT.trueMonthlyCost) * 100,
  );

  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card">
      <p className="font-mono text-[0.625rem] font-medium tracking-[0.08em] uppercase text-ink-muted">
        {SAMPLE_UNIT.barangay}
      </p>

      <dl className="mt-5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[0.875rem] text-ink-muted">Advertised rent</dt>
          <dd
            data-figure=""
            className="text-[0.9375rem] font-medium text-ink-muted"
          >
            {peso(SAMPLE_UNIT.advertisedRent)}
          </dd>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="text-[0.875rem] font-medium text-ink">
            True monthly cost
          </dt>
          <dd
            data-figure=""
            className="text-[1.625rem] font-bold tracking-[-0.03em] text-ink"
          >
            {peso(SAMPLE_UNIT.trueMonthlyCost)}
          </dd>
        </div>
      </dl>

      <div
        aria-hidden="true"
        className="mt-5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {/* Rent's share is computed, so the value arrives as a custom property
            and `w-(--…)` does the declaring. */}
        <span
          className="w-(--share) bg-ink"
          style={{ "--share": `${rentShare}%` } as CSSProperties}
        />
        <span className="flex-1 bg-brand" />
      </div>

      <p className="mt-2.5 flex justify-between gap-4 text-[0.75rem] text-ink-muted">
        <span>Rent {rentShare}%</span>
        <span>Everything else {100 - rentShare}%</span>
      </p>
    </div>
  );
}

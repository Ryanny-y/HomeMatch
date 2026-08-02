import { totalMonthlyCost } from "@homematch/shared";
import type { CostCategory, CostLine } from "@homematch/shared";
import { peso } from "@/lib/format";

/**
 * What the true monthly figure is made of.
 *
 * The number used to appear on its own, and a landlord who entered ₱5,000 rent
 * saw ₱6,450 with no way to find out why. PRODUCT.md asks that every number be
 * traceable; a total with no lines under it is the opposite.
 *
 * `components/product/cost-category.ts` looks like the right thing to reuse and
 * is not: it keys off the landing page's own `CostCategory` from
 * `sample-listing.ts`, which still carries six illustrative categories. This
 * maps the three a live listing can produce. Unifying those two type systems is
 * a real refactor and does not belong here.
 *
 * Classes are written out because Tailwind scans source text — `bg-cat-${key}`
 * would never be generated.
 */
const LINE: Record<CostCategory, { label: string; fill: string }> = {
  rent: { label: "Rent", fill: "bg-cat-rent" },
  parking: { label: "Parking", fill: "bg-cat-parking" },
  other: { label: "Other monthly costs", fill: "bg-cat-dues" },
};

export function CostBreakdown({
  lines,
  parkingIncluded = false,
}: {
  lines: CostLine[];
  /**
   * Parking offered at no charge produces no line, which reads as a missing
   * feature rather than a free one. Say so instead of leaving a gap.
   */
  parkingIncluded?: boolean;
}) {
  return (
    <dl className="text-[0.875rem]">
      {lines.map((line) => (
        <div
          key={line.category}
          className="flex items-baseline justify-between gap-3 border-b border-line py-1.5"
        >
          <dt className="flex items-center gap-2 text-ink-soft">
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${LINE[line.category].fill}`} />
            {LINE[line.category].label}
          </dt>
          <dd data-figure className="font-semibold text-ink">
            {peso(line.amount)}
          </dd>
        </div>
      ))}

      {parkingIncluded ? (
        <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5">
          <dt className="flex items-center gap-2 text-ink-soft">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-cat-parking" />
            Parking
          </dt>
          <dd className="text-ink-muted">Included</dd>
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-3 pt-2">
        <dt className="font-bold text-ink">True monthly</dt>
        <dd data-figure className="text-[1.0625rem] font-bold tracking-[-0.01em] text-ink">
          {peso(totalMonthlyCost(lines))}
        </dd>
      </div>
    </dl>
  );
}

import Link from "next/link";
import type { ReadinessGap } from "@homematch/shared";

/**
 * The signature element: what a renter still cannot learn about this unit.
 *
 * Not a percentage ring. A ring says "you are 60% done" — a fact about the
 * form. This says "renters can't see your true monthly cost", which is a fact
 * about the listing, and it is the only framing that makes filling in
 * enrichment feel like the job rather than paperwork.
 *
 * Impacts are deduplicated because three missing cost fields produce one
 * consequence, and listing it three times reads as three problems.
 */

/** How many gap chips a dashboard row shows before collapsing the rest. */
const COMPACT_CHIP_LIMIT = 3;

function GapChips({
  gaps,
  listingId,
  overflow = 0,
}: {
  gaps: readonly ReadinessGap[];
  listingId: string;
  overflow?: number;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {gaps.map((gap) => (
        <li key={gap.field}>
          {/* Each gap links to the field that closes it — naming the problem
              without offering the fix is only half the job. */}
          <Link
            href={`/landlord/listings/${listingId}/edit#${gap.field}`}
            className="inline-flex min-h-8 items-center rounded-chip border border-gold-line bg-gold-soft px-2.5 text-[0.75rem] font-semibold text-gold-ink transition-colors hover:border-gold hover:bg-gold/15"
          >
            {gap.label}
          </Link>
        </li>
      ))}
      {overflow > 0 ? (
        <li className="inline-flex min-h-8 items-center text-[0.75rem] font-medium text-ink-faint">
          +{overflow} more
        </li>
      ) : null}
    </ul>
  );
}

export function ReadinessStatement({
  gaps,
  listingId,
  compact = false,
}: {
  gaps: readonly ReadinessGap[];
  listingId: string;
  compact?: boolean;
}) {
  if (gaps.length === 0) {
    return (
      <p className="text-[0.875rem] text-live-ink">
        Renters can see everything they need to decide.
      </p>
    );
  }

  const impacts = [...new Set(gaps.map((gap) => gap.renterImpact))];

  /**
   * A row shows the consequence once and then the fields that fix it. The
   * previous compact form showed "+2 more" instead of the chips, which hid the
   * only part a landlord can act on.
   */
  if (compact) {
    const [lead = "", ...rest] = impacts;

    return (
      <div>
        <p className="text-[0.875rem] leading-snug font-semibold text-gold-ink">
          {/* Each impact is a full sentence, so the clause has to replace its
              full stop rather than follow it. */}
          {rest.length > 0 ? lead.replace(/\.$/, "") : lead}
          {rest.length > 0 ? (
            <span className="font-medium text-ink-muted">
              , and {rest.length} other{rest.length > 1 ? "s" : ""}.
            </span>
          ) : null}
        </p>
        <div className="mt-2">
          <GapChips
            gaps={gaps.slice(0, COMPACT_CHIP_LIMIT)}
            listingId={listingId}
            overflow={Math.max(0, gaps.length - COMPACT_CHIP_LIMIT)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-1.5">
        {impacts.map((impact) => (
          <li key={impact} className="text-[0.875rem] leading-snug text-ink-soft">
            {impact}
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <GapChips gaps={gaps} listingId={listingId} />
      </div>
    </div>
  );
}

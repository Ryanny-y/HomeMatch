import Link from "next/link";
import type { Listing } from "@/features/listings/api/listings.api";
import { needsAttention, statusOf } from "@/features/listings/listing-status";
import type { StatusFilter as Filter } from "@/features/listings/listing-status";

/**
 * The four status columns, collapsed into one filter row.
 *
 * Columns forced every unit into a location, so finding a particular one meant
 * scanning four places and, under `lg`, four stacked sections on a phone. The
 * counts were the only part worth keeping, and they live on the chips now.
 *
 * Links rather than buttons with local state: the filter belongs in the URL
 * (`frontend/CLAUDE.md` — "URL state → searchParams for filters"), which makes
 * a filtered view linkable and hands the back button its expected behaviour for
 * free. `aria-current` is the accessible pattern for a selected link; a toggle's
 * `aria-pressed` would be a lie about what these are.
 */
export function StatusFilter({
  listings,
  active,
}: {
  listings: readonly Listing[];
  active: Filter;
}) {
  const counts = {
    all: listings.filter((l) => l.status !== "archived").length,
    needs_work: listings.filter(needsAttention).length,
    ready: listings.filter((l) => statusOf(l) === "ready").length,
    live: listings.filter((l) => statusOf(l) === "live").length,
    archived: listings.filter((l) => statusOf(l) === "archived").length,
  };

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "needs_work", label: "Needs work", count: counts.needs_work },
    { key: "ready", label: "Ready", count: counts.ready },
    { key: "live", label: "Live", count: counts.live },
  ];

  // Archived only appears once something is archived — an empty chip for dead
  // inventory is a permanent reminder of nothing.
  if (counts.archived > 0) {
    chips.push({ key: "archived", label: "Archived", count: counts.archived });
  }

  return (
    <nav aria-label="Filter units by status" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {chips.map((chip) => {
          const selected = chip.key === active;

          return (
            <li key={chip.key}>
              <Link
                href={chip.key === "all" ? "/landlord" : `/landlord?status=${chip.key}`}
                scroll={false}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-chip border px-3.5 text-[0.875rem] font-semibold transition-colors duration-200 ${
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-line-strong bg-surface text-ink-soft hover:border-brand hover:text-brand"
                }`}
              >
                {chip.label}
                <span
                  data-figure
                  className={`text-[0.75rem] font-bold ${
                    selected ? "text-white/75" : "text-ink-faint"
                  }`}
                >
                  {chip.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

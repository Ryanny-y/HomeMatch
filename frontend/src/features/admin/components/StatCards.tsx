import Link from "next/link";
import type { AdminOverviewDto } from "@homematch/shared";
import { Card, CardContent } from "@/components/shadcn/card";

/**
 * The four figures, each a count of rows.
 *
 * Deliberately no trend arrows and no percentages. A "+180%" on a base of two
 * users is noise wearing a signal's clothes, and this product's whole claim is
 * that its numbers can be checked. "+1 in the last 7 days" is the same fact
 * without the theatre.
 */
export function StatCards({ overview }: { overview: AdminOverviewDto }) {
  const { users, listings } = overview;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Accounts"
        value={users.total}
        note={`${users.byRole.renter} renters · ${users.byRole.landlord} landlords`}
        delta={users.newLast7Days}
      />
      <Stat
        label="Listings"
        value={listings.total}
        note={`${listings.byStatus.draft} draft · ${listings.byStatus.archived} archived`}
        delta={listings.newLast7Days}
      />
      <Stat
        label="Live to renters"
        value={listings.byStatus.published}
        note={
          listings.total === 0
            ? "Nothing published yet"
            : `of ${listings.total} listing${listings.total === 1 ? "" : "s"}`
        }
        tone="live"
      />
      <Stat
        label="Blocked by gaps"
        value={listings.blockedByGaps}
        note={
          listings.blockedByGaps === 0
            ? "Every draft is ready"
            : "Drafts missing something renters need"
        }
        tone={listings.blockedByGaps > 0 ? "blocked" : undefined}
        href={listings.blockedByGaps > 0 ? "/admin/listings?status=draft" : undefined}
      />
    </div>
  );
}

const TONE = {
  live: "text-live-ink",
  blocked: "text-gold-ink",
} as const;

function Stat({
  label,
  value,
  note,
  delta,
  tone,
  href,
}: {
  label: string;
  value: number;
  note: string;
  delta?: number;
  tone?: keyof typeof TONE;
  href?: string;
}) {
  const body = (
    <CardContent className="p-5">
      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </p>

      <p
        data-figure
        className={`mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.03em] ${
          tone ? TONE[tone] : "text-ink"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-[0.8125rem] text-ink-muted">{note}</p>

      {delta !== undefined ? (
        <p className="mt-1 text-[0.8125rem] text-ink-faint">
          {delta === 0 ? (
            "None in the last 7 days"
          ) : (
            <>
              <span data-figure>+{delta}</span> in the last 7 days
            </>
          )}
        </p>
      ) : null}
    </CardContent>
  );

  if (!href) return <Card>{body}</Card>;

  return (
    <Card className="lift transition-colors hover:border-line-strong">
      <Link href={href} className="block rounded-card">
        {body}
      </Link>
    </Card>
  );
}

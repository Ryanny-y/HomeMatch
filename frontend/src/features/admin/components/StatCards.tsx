import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Building2, Eye, TriangleAlert, Users } from "lucide-react";
import type { AdminOverviewDto } from "@homematch/shared";
import { Card, CardContent } from "@/components/shadcn/card";

/**
 * The four figures, each a count of rows.
 *
 * Deliberately no trend arrows and no percentages. A "+180%" on a base of two
 * users is noise wearing a signal's clothes, and this product's whole claim is
 * that its numbers can be checked. "+1 in the last 7 days" is the same fact
 * without the theatre.
 *
 * **Colour marks state, never identity.** Accounts and listings are inventory —
 * there is nothing to do about them, so they stay neutral. Live and blocked are
 * states the founder acts on, so they carry the two roles the colour contract
 * already defines for exactly this: `live` for what renters can see, `gold` for
 * work still owed. Two coloured tiles out of four, and the plain ones say
 * "nothing here needs you".
 */
export function StatCards({ overview }: { overview: AdminOverviewDto }) {
  const { users, listings } = overview;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        icon={Users}
        label="Accounts"
        value={users.total}
        note={`${users.byRole.renter} renters · ${users.byRole.landlord} landlords`}
        delta={users.newLast7Days}
      />
      <Stat
        icon={Building2}
        label="Listings"
        value={listings.total}
        note={`${listings.byStatus.draft} draft · ${listings.byStatus.archived} archived`}
        delta={listings.newLast7Days}
      />
      <Stat
        icon={Eye}
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
        icon={TriangleAlert}
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
  live: { figure: "text-live-ink", chip: "bg-live-soft text-live-ink" },
  blocked: { figure: "text-gold-ink", chip: "bg-gold-soft text-gold-ink" },
} as const;

const NEUTRAL_CHIP = "bg-surface-sunken text-ink-muted";

function Stat({
  icon: Icon,
  label,
  value,
  note,
  delta,
  tone,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  note: string;
  delta?: number;
  tone?: keyof typeof TONE;
  href?: string;
}) {
  const body = (
    <CardContent className="p-5">
      {/* The label and the figure are one statement, so they sit tight; the
          breakdown below is a separate thought and gets real air. */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {label}
        </p>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-chip ${
            tone ? TONE[tone].chip : NEUTRAL_CHIP
          }`}
        >
          <Icon aria-hidden className="size-4" />
        </span>
      </div>

      <p
        data-figure
        className={`mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.03em] ${
          tone ? TONE[tone].figure : "text-ink"
        }`}
      >
        {value}
      </p>

      {/* Fixed offset, not `mt-auto`. Bottom-anchoring aligned the four notes
          on one baseline but opened a hole mid-card on the two tiles that have
          no delta line — trailing space under the last line reads as padding,
          the same space above it reads as a mistake. */}
      <div className="mt-4 space-y-1">
        {/* Two readable steps rather than one readable and one not: `ink-faint`
            is 2.56:1 on white, below the 4.5:1 floor for body text. The
            hierarchy now comes from `soft` vs `muted`, which are 10.9:1 and
            7.6:1. */}
        <p className="text-[0.8125rem] leading-snug text-ink-soft">{note}</p>

        {delta !== undefined ? (
          /**
           * A pill, not a sentence — but a neutral one. The reference this
           * follows tints its deltas green; here green means "renters can see
           * it" and nothing else, so borrowing it for "went up" would spend a
           * meaning the product needs. The arrow carries the direction, and
           * growth on a hand-seeded catalog is not a result worth colouring.
           */
          <p className="flex items-center gap-1.5 text-[0.8125rem] leading-snug text-ink-muted">
            {delta === 0 ? (
              "None in the last 7 days"
            ) : (
              <>
                <span className="inline-flex items-center gap-1 rounded-chip bg-surface-sunken px-1.5 py-0.5 font-semibold text-ink-soft">
                  <ArrowUpRight aria-hidden className="size-3.5" />
                  <span data-figure>{delta}</span>
                </span>
                in the last 7 days
              </>
            )}
          </p>
        ) : null}
      </div>
    </CardContent>
  );

  /**
   * `gap-0 py-0` because `Card` ships `py-6` and `CardContent` adds its own
   * padding on top — left alone the tile carries 44px of vertical padding
   * against 20px horizontal, which is what made these read as floating.
   */
  /**
   * `border-0 shadow-card`: depth instead of an outline. `shadow-card` carries
   * both an offset and a soft blur, so the card sits on the sunken well rather
   * than being drawn onto it.
   */
  if (!href) return <Card className="gap-0 border-0 py-0 shadow-card">{body}</Card>;

  return (
    <Card className="lift gap-0 border-0 py-0 shadow-card">
      <Link href={href} className="block rounded-card">
        {body}
      </Link>
    </Card>
  );
}

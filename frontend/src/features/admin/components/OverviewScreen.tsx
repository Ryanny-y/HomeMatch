"use client";

import { Info } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Skeleton } from "@/components/shadcn/skeleton";
import { useOverview } from "@/features/admin/hooks/useAdmin";
import { OVERVIEW_NOTE } from "@/features/admin/content";
import { StatCards } from "@/features/admin/components/StatCards";
import { ActivityChart } from "@/features/admin/components/ActivityChart";

export function OverviewScreen() {
  const { data, isPending, error } = useOverview();

  if (error) return <Alert tone="error">{error.message}</Alert>;

  if (isPending || !data) {
    return (
      // The placeholders are shaped like the cards they stand in for — white,
      // raised, pulsing on the sunken well — rather than the brand-tinted bars
      // Skeleton ships with.
      <div className="space-y-8" aria-busy>
        <span className="sr-only">Loading the overview.</span>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-card bg-surface shadow-card" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-card bg-surface shadow-card" />
          <Skeleton className="h-80 rounded-card bg-surface shadow-card" />
        </div>
      </div>
    );
  }

  return (
    // 32px between sections against 16px inside a grid — a 2:1 step, so a
    // section boundary reads as one. They were 24 and 16, close enough that
    // everything sat at the same apparent level.
    <div className="space-y-8">
      <StatCards overview={data} />

      <ActivityChart
        signupsByDay={data.signupsByDay}
        listingsByDay={data.listingsByDay}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <VerificationCard
          verified={data.users.verified}
          unverified={data.users.unverified}
        />
        <RentCard rent={data.publishedRent} />
      </div>

      {/* The rule spans the column; only the text is measured. Putting the
          border on the constrained paragraph truncated it mid-page, which read
          as a broken divider rather than a section break. */}
      <div className="border-t border-line pt-6">
        <p className="flex max-w-prose items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-faint" />
          {OVERVIEW_NOTE}
        </p>
      </div>
    </div>
  );
}

function VerificationCard({
  verified,
  unverified,
}: {
  verified: number;
  unverified: number;
}) {
  const total = verified + unverified;
  const share = total === 0 ? 0 : Math.round((verified / total) * 100);

  return (
    <Card className="gap-3 border-0 shadow-card">
      <CardHeader>
        <CardTitle className="text-[0.9375rem]">Email verification</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-[0.8125rem] text-ink-muted">No accounts yet.</p>
        ) : (
          <>
            <p data-figure className="text-[1.75rem] font-extrabold leading-none">
              {share}%
            </p>
            <p className="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-muted">
              <span data-figure>{verified}</span> verified,{" "}
              <span data-figure>{unverified}</span> not. An unverified account can
              sign in but has never proved the address.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RentCard({
  rent,
}: {
  rent: { average: number; min: number; max: number } | null;
}) {
  return (
    <Card className="gap-3 border-0 shadow-card">
      <CardHeader>
        <CardTitle className="text-[0.9375rem]">Published rent</CardTitle>
      </CardHeader>
      <CardContent>
        {rent === null ? (
          <p className="max-w-prose text-[0.8125rem] leading-relaxed text-ink-muted">
            Nothing is published yet, so there is no rent to average. Drafts and
            archived units are deliberately excluded — nobody can rent them.
          </p>
        ) : (
          <>
            <p data-figure className="text-[1.75rem] font-extrabold leading-none">
              {peso(rent.average)}
            </p>
            <p className="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-muted">
              Average across live listings. Ranges{" "}
              <span data-figure>{peso(rent.min)}</span> to{" "}
              <span data-figure>{peso(rent.max)}</span>. Advertised rent, not true
              monthly cost.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function peso(value: number): string {
  return `₱${Math.round(value).toLocaleString("en-PH")}`;
}

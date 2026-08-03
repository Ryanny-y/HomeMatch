"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { DailyCount } from "@homematch/shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/shadcn/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";

/**
 * Two charts, not one with two series.
 *
 * Signups and listings are different *kinds* of thing, and a grouped bar chart
 * would need a categorical pair to tell them apart. The only second hue the
 * colour contract leaves free is a near-neutral slate, which fails the chroma
 * floor a categorical palette needs — and the six cost hues are not available,
 * because those identify a cost line and nothing else.
 *
 * Small multiples sidestep the whole question: one series each, both in brand
 * blue (validated: passes lightness, chroma and 3:1 against the surface), no
 * legend needed because the title names the series.
 */

const config = {
  count: { label: "Count", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

export function ActivityChart({
  signupsByDay,
  listingsByDay,
}: {
  signupsByDay: DailyCount[];
  listingsByDay: DailyCount[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ActivityPanel
        title="Accounts created"
        description="New signups per day, last 30 days."
        data={signupsByDay}
        noun="signup"
      />
      <ActivityPanel
        title="Listings created"
        description="New listings per day, last 30 days."
        data={listingsByDay}
        noun="listing"
      />
    </div>
  );
}

function ActivityPanel({
  title,
  description,
  data,
  noun,
}: {
  title: string;
  description: string;
  data: DailyCount[];
  noun: string;
}) {
  const total = data.reduce((sum, day) => sum + day.count, 0);

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="text-[0.9375rem]">{title}</CardTitle>
        <p className="text-[0.8125rem] text-ink-muted">{description}</p>
      </CardHeader>

      <CardContent>
        {total === 0 ? (
          <p className="flex h-52 items-center justify-center text-center text-[0.8125rem] text-ink-muted">
            No {noun}s in the last 30 days.
          </p>
        ) : (
          <>
            <ChartContainer config={config} className="h-52 w-full">
              <BarChart data={data} margin={{ left: -20, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={shortDate}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      // Recharts types the label as ReactNode; only a string is
                      // a date this can format.
                      labelFormatter={(label) =>
                        typeof label === "string" ? longDate(label) : label
                      }
                    />
                  }
                />
                {/* Rounded data-end anchored to the baseline; the gap keeps
                    adjacent bars from reading as one block. */}
                <Bar
                  dataKey="count"
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ChartContainer>

            {/* A bar chart is not readable by a screen reader, and squinting at
                30 bars is a poor way to read an exact figure either. */}
            <details className="disclosure mt-3">
              <summary className="cursor-pointer text-[0.8125rem] text-ink-muted hover:text-ink">
                {total} {total === 1 ? noun : `${noun}s`} in this window — see the days
              </summary>
              <table className="mt-2 w-full text-[0.8125rem]">
                <caption className="sr-only">{title} by day</caption>
                <thead>
                  <tr>
                    <th scope="col" className="py-1 text-left font-semibold">
                      Day
                    </th>
                    <th scope="col" className="py-1 text-right font-semibold">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data
                    .filter((day) => day.count > 0)
                    .map((day) => (
                      <tr key={day.date} className="border-t border-line">
                        <td className="py-1">{longDate(day.date)}</td>
                        <td data-figure className="py-1 text-right">
                          {day.count}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Parsed as a local calendar date, not a timestamp.
 *
 * `new Date("2026-08-04")` is midnight *UTC*, which renders as 3 August in
 * Manila — the chart would disagree with the date the row was filed under.
 */
function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function shortDate(value: string): string {
  return parseDay(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function longDate(value: string): string {
  return parseDay(value).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

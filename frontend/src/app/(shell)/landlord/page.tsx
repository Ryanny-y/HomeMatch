import type { Metadata } from "next";
import { LandlordDashboard } from "@/features/listings";
import { isStatusFilter } from "@/features/listings/listing-status";

export const metadata: Metadata = {
  title: "Your units",
  robots: { index: false, follow: false },
};

export default async function LandlordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { status } = await searchParams;
  const requested = Array.isArray(status) ? status[0] : status;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-ink">Your units</h1>
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-[1.6] text-ink-muted">
          A unit goes live once renters can answer the questions they decide on: what it
          really costs, where exactly it is, and what it looks like.
        </p>
      </header>

      <LandlordDashboard filter={isStatusFilter(requested) ? requested : "all"} />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { NewListingForm } from "@/features/listings";

export const metadata: Metadata = {
  title: "Add a unit",
  robots: { index: false, follow: false },
};

export default function NewListingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/landlord"
        className="text-[0.875rem] font-medium text-ink-muted transition-colors hover:text-brand"
      >
        ← Your units
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-ink">
          Add a unit
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-ink-muted">
          Five things now, saved as a draft. The rest — costs, the map pin,
          photos — comes next and is what makes it publishable.
        </p>
      </header>

      <NewListingForm />
    </main>
  );
}

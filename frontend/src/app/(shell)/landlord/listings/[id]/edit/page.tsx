import type { Metadata } from "next";
import Link from "next/link";
import { EditListingScreen } from "@/features/listings";

export const metadata: Metadata = {
  title: "Edit unit",
  robots: { index: false, follow: false },
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/landlord"
        className="text-[0.875rem] font-medium text-ink-muted transition-colors hover:text-brand"
      >
        ← Your units
      </Link>

      <div className="mt-4">
        <EditListingScreen id={id} />
      </div>
    </main>
  );
}

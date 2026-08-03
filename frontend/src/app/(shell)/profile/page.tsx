import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileScreen } from "@/features/profile";
import { currentUser } from "@/lib/session";
import { homeFor } from "@/lib/site";
import { QueryProvider } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

/**
 * The role gate runs here rather than in `middleware.ts`, matching `/landlord`:
 * middleware would need `JWT_SECRET` copied into the frontend, and two places
 * that can decide who you are is one too many. The API enforces this too — a
 * landlord calling `/api/profile` gets a 403 regardless of what the UI does.
 */
export default async function ProfilePage() {
  const user = await currentUser();

  if (!user) redirect("/login");
  if (user.role !== "renter") redirect(homeFor(user.role));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <QueryProvider>
        <ProfileScreen user={user} />
      </QueryProvider>
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { homeFor } from "@/lib/site";
import { QueryProvider } from "@/providers/QueryProvider";
import { AdminShell } from "@/features/admin";

export const metadata: Metadata = {
  // The root layout appends "· HomeMatch AI" via its title template.
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * The role gate, and the reason `/admin` sits outside the `(shell)` group.
 *
 * A Server Component asking the API rather than a `middleware.ts` verifying the
 * JWT itself: middleware would need `JWT_SECRET` copied into the frontend, and
 * two places that can decide who you are is one too many. The API enforces the
 * same rule regardless — this only decides what gets rendered.
 *
 * A non-admin goes to their own home rather than to a 403 page: they are not
 * doing anything wrong, they are just in the wrong place.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(homeFor(user.role));

  return (
    <QueryProvider>
      <AdminShell user={user}>{children}</AdminShell>
    </QueryProvider>
  );
}

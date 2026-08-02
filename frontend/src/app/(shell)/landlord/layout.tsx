import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { QueryProvider } from "@/providers/QueryProvider";

/**
 * The role gate.
 *
 * A Server Component asking the API rather than a `middleware.ts` verifying the
 * JWT itself: middleware would need `JWT_SECRET` copied into the frontend, and
 * two places that can decide who you are is one too many.
 */
export default async function LandlordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  if (!user) redirect("/login");
  if (user.role !== "landlord" && user.role !== "admin") redirect("/dashboard");

  return <QueryProvider>{children}</QueryProvider>;
}

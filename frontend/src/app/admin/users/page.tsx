import { redirect } from "next/navigation";
import { adminUserQuerySchema } from "@homematch/shared";
import { currentUser } from "@/lib/session";
import { firstValues } from "@/lib/search-params";
import { UsersScreen } from "@/features/admin";

/**
 * The URL is the filter state, so it is parsed with the same schema the API
 * validates against. A malformed hand-typed query falls back to the defaults
 * rather than erroring — the page still works, it just ignores the nonsense.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();

  // The layout already gated this; the check narrows the type for `currentUserId`.
  if (!user) redirect("/login");

  const raw = firstValues(await searchParams);
  const parsed = adminUserQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : adminUserQuerySchema.parse({});

  return <UsersScreen query={query} currentUserId={user.id} />;
}

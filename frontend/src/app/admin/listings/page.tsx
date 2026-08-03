import { adminListingQuerySchema } from "@homematch/shared";
import { firstValues } from "@/lib/search-params";
import { ListingsScreen } from "@/features/admin";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = firstValues(await searchParams);
  const parsed = adminListingQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : adminListingQuerySchema.parse({});

  return <ListingsScreen query={query} />;
}

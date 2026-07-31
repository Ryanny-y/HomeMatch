import type { Metadata } from "next";

import { VerifyEmailClient } from "@/features/auth";
import { firstParam, type SearchParams } from "@/lib/params";

/** Not indexed — this URL carries a single-use verification token. */
export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <VerifyEmailClient
      token={firstParam(params.token)}
      email={firstParam(params.email)}
    />
  );
}

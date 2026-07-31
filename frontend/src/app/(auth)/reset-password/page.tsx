import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth";
import { firstParam, type SearchParams } from "@/lib/params";

/**
 * Never indexed: the URL carries a single-use reset token, and a crawler
 * following it would spend the token before the account holder does.
 */
export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return <ResetPasswordForm token={firstParam(params.token)} />;
}

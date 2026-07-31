import type { Metadata } from "next";

import { LoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in to HomeMatch AI to see your saved Quezon City apartments, match scores, and shortlists.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginForm />;
}

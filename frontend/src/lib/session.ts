import { cookies } from "next/headers";
import type { AuthenticatedUser } from "@homematch/shared";

/**
 * Who is signed in, resolved on the server.
 *
 * The API stays the single authority on identity — verifying the JWT here would
 * mean copying `JWT_SECRET` into the frontend and having two places that can
 * decide who you are.
 *
 * A server-side fetch carries no cookie jar, so the incoming header is
 * forwarded by hand.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function currentUser(): Promise<AuthenticatedUser | null> {
  const jar = await cookies();
  const header = jar.toString();

  if (!header) return null;

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: header },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      data: { user: AuthenticatedUser } | null;
    };

    return payload.data?.user ?? null;
  } catch {
    // An unreachable API is not the same as being signed out, but from here the
    // two are indistinguishable and treating it as signed out is the safe read.
    return null;
  }
}

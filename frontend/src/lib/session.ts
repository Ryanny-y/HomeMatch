import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

/**
 * The session gate for a page that needs one.
 *
 * `next` is where to return after signing in, and is passed by the caller
 * rather than read from the request because Next gives a Server Component no
 * reliable handle on its own URL — `/listings/[slug]` only knows its return
 * path once `params` has been awaited.
 *
 * This is convenience, not a security boundary. The API enforces the same rule
 * on its own (`catalogRouter` sits behind `requireAuth`), which is what actually
 * protects the data; skipping this call would render an error page, not leak a
 * catalog.
 */
export async function requireUser(next: string): Promise<AuthenticatedUser> {
  const user = await currentUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  return user;
}

/** The cookie header to forward on a server-side API call, or `undefined`. */
export async function forwardedCookies(): Promise<string | undefined> {
  const header = (await cookies()).toString();

  return header || undefined;
}

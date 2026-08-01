import type { CookieOptions, Response } from "express";
import { env } from "../../shared/config/env";

export const ACCESS_COOKIE = "hm_at";
export const REFRESH_COOKIE = "hm_rt";


const REFRESH_PATH = "/api/auth";

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    /**
     * `lax`, not `strict`.
     *
     * Strict withholds the cookie on a top-level navigation *into* the app, so
     * following a link from an email would show a signed-out page to a signed-in
     * user — exactly the flow email verification depends on.
     *
     * Lax is also the only CSRF defence here: it withholds the cookie on
     * cross-site POST/PUT/PATCH/DELETE, and every state-changing endpoint is a
     * POST. This makes SameSite *load-bearing security*, not a convenience.
     *
     * It requires the API and frontend to be same-site. In development a port is
     * not part of a "site", so :3000 → :4000 qualifies. In production they must
     * share a registrable domain, or this has to become `none` + `secure` — at
     * which point real CSRF tokens are genuinely required. See the hardening
     * note before changing this.
     */
    sameSite: "lax",
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    path: "/",
    maxAge: env.accessTtlMs,
  });

  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    path: REFRESH_PATH,
    maxAge: env.sessionTtlMs,
  });
}

export function clearAuthCookies(res: Response): void {
  // Same flags as the set, minus maxAge — see the note at the top of this file.
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: REFRESH_PATH });
}

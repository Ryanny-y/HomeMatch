import type { CookieOptions, Response } from "express";
import { env } from "../../shared/config/env";

export const ACCESS_COOKIE = "hm_at";
export const REFRESH_COOKIE = "hm_rt";


const REFRESH_PATH = "/api/auth";

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
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
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: REFRESH_PATH });
}

import type { Request, RequestHandler } from "express";
import type { Role } from "@homematch/shared";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError";
import { verifyAccessToken } from "../security/token";
import { ACCESS_COOKIE } from "../../features/auth/auth.cookies";

export type AuthContext = {
  userId: string;
  role: Role;
  emailVerified: boolean;
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[ACCESS_COOKIE];

  if (typeof token !== "string" || token.length === 0) {
    next(new UnauthorizedError("You need to be signed in to do that."));
    return;
  }

  void verifyAccessToken(token).then((claims) => {
    if (!claims) {
      // Expired, tampered, wrong algorithm — all the same to the caller. The
      // client's move is identical in every case: refresh, then retry.
      next(new UnauthorizedError("Your session has expired. Please sign in again."));
      return;
    }

    req.auth = claims;
    next();
  }, next);
};

export function requireRole(...roles: readonly Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      // A programming error, not a client one: requireRole was wired before
      // requireAuth. Fail closed rather than silently allowing the request.
      next(new UnauthorizedError("You need to be signed in to do that."));
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
}

export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new UnauthorizedError("You need to be signed in to do that.");
  }
  return req.auth;
}

import type { Request, RequestHandler } from "express";
import type { Role } from "@homematch/shared";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError";
import { verifyAccessToken } from "../security/token";
import { ACCESS_COOKIE } from "../../features/auth/auth.cookies";

/**
 * The authentication boundary. Token parsing stops here.
 *
 * Services receive an `AuthContext` — an already-authenticated actor — never a
 * raw request or token. That is what lets a service be unit-tested without
 * constructing a JWT.
 *
 * **No database round trip.** Verifying a signature is the whole per-request
 * cost, and that is the entire reason this project uses a short-lived JWT
 * instead of a session row. The price is that `role` and `emailVerified` are
 * claims: a role change takes up to ACCESS_TTL_MINUTES to take effect, and
 * `/refresh` is what re-reads them from the database.
 */
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

/**
 * Coarse role gating. Must run *after* `requireAuth`.
 *
 * `backend/CLAUDE.md` says authorization belongs in the service, and this does
 * not contradict it — the two answer different questions:
 *
 *   - **Middleware answers *who*.** "Is this actor even the kind of user this
 *     route is for?" is answerable from the token alone, so it belongs here.
 *   - **The service answers *whether*.** "Is this *your* listing?" needs the
 *     record, so it cannot live here and must not be faked here.
 *
 * Returns **403, not 401**, and the distinction is deliberate: 401 means sign
 * in, 403 means signing in again will not help. The client renders them
 * differently — one shows a login form, the other an explanation.
 *
 * Prefer applying this to a whole router over repeating it per route, so a
 * route added later cannot forget it.
 */
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

/**
 * Reads the actor a guard has already established.
 *
 * Throws rather than returning undefined, so a controller cannot accidentally
 * proceed unauthenticated because someone forgot the middleware. This is the
 * only sanctioned way to reach `req.auth`.
 */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new UnauthorizedError("You need to be signed in to do that.");
  }
  return req.auth;
}

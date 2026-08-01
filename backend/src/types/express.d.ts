import type { AuthContext } from "../shared/middleware/requireAuth";

/**
 * Parks the authenticated actor on the request.
 *
 * Optional on the type because most requests are unauthenticated. `requireAuth`
 * narrows it for everything downstream of itself, so a controller behind the
 * guard reads `req.auth` through `getAuth(req)` rather than asserting.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};

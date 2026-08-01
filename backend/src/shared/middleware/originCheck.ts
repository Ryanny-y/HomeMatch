import type { RequestHandler } from "express";
import { ForbiddenError } from "../errors/AppError";
import { env } from "../config/env";

/**
 * Rejects state-changing requests whose Origin isn't on the allowlist.
 *
 * **Why this exists when CORS already checks Origin:** CORS is enforced by the
 * *browser*, and it governs whether a response may be read. A cross-site form
 * POST is a "simple request" — the browser sends it, the server processes it,
 * and only the reply is withheld. If the request had side effects, the damage
 * is done. CORS is not a server-side access control.
 *
 * **And why this exists when SameSite=Lax already blocks cross-site POSTs:**
 * because Lax is currently the *only* thing standing between this API and CSRF,
 * and it is one deployment decision away from being switched off. If the API
 * and frontend end up on unrelated hosts, `sameSite` has to become `none`, and
 * a change made for connectivity reasons would silently remove a security
 * control. This is the second lock, so that never becomes a single point of
 * failure.
 *
 * It is *not* a substitute for CSRF tokens under `SameSite=None` — Origin can
 * be absent in some legitimate cases, and this deliberately allows those.
 * If the topology changes, add real tokens. See the hardening note.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const originCheck: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");

  // No Origin header at all: a same-origin form post from an older browser, a
  // server-to-server call, curl, or a health checker. Browsers have sent Origin
  // on cross-origin POSTs for years, so an absent header is not the attack we
  // are defending against — and rejecting it would break curl and Postman for
  // no security gain.
  if (!origin) {
    next();
    return;
  }

  if (!env.allowedOrigins.includes(origin)) {
    next(new ForbiddenError("Request blocked: unrecognised origin."));
    return;
  }

  next();
};

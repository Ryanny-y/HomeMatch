import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { RequestHandler } from "express";
import { ERROR_CODES } from "@homematch/shared";
import { env } from "../config/env";
import { fail } from "../response/envelope";

/**
 * Throttles for the endpoints that are worth attacking or expensive to run.
 *
 * **Known limitation, deliberately shipped:** the default store is in-process.
 * On more than one Fargate task each task keeps its own counter, so the real
 * limit is N× what is configured here, and every deploy resets it. That makes
 * these limits meaningful in development and only advisory in production.
 * Fixing it needs a shared store (Redis) and is tracked in the hardening note.
 * Recorded here so nobody reads these numbers and believes them.
 */

/**
 * Relaxed outside production so that developing a form does not lock you out of
 * your own application after five submissions.
 */
function limitFor(production: number): number {
  return env.isProduction ? production : 1000;
}

function handler(message: string): RequestHandler {
  return (_req, res) => {
    res.status(429).json(fail(ERROR_CODES.RATE_LIMITED, message));
  };
}

/**
 * Keys on IP *and* email together.
 *
 * IP alone punishes everyone behind one NAT — an office, a university, a mobile
 * carrier's CGNAT, which in Metro Manila is most of the audience. Email alone
 * lets one attacker spray thousands of addresses from one machine. Together,
 * one attacker cannot lock out one account from many IPs, and one shared IP
 * cannot lock out its own users.
 *
 * `ipKeyGenerator` is used rather than raw `req.ip` because express-rate-limit
 * v8 requires it to normalise IPv6 — an attacker with a /64 would otherwise get
 * a fresh bucket per address.
 */
function emailAndIpKey(req: { ip?: string; body?: unknown }): string {
  const body = req.body;
  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email: unknown }).email).toLowerCase().trim()
      : "";

  return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
}

/** Login. Only failures count, so a working session is never throttled. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limitFor(10),
  keyGenerator: emailAndIpKey,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Too many sign-in attempts. Try again in a few minutes."),
});

/**
 * Registration. Tighter than login because every success sends a billable
 * email through Resend — an open signup endpoint is both a spam vector and an
 * invoice.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: limitFor(5),
  keyGenerator: emailAndIpKey,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Too many accounts created from here. Try again later."),
});

/**
 * Resending verification. The tightest of the three: it sends mail on demand
 * and needs no credentials at all to call.
 */
export const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: limitFor(3),
  keyGenerator: emailAndIpKey,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("We've sent that a few times already. Check your spam folder."),
});

/** Token submission — cheap, but brute-forcing a token should still be capped. */
export const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limitFor(20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Too many attempts. Try again in a few minutes."),
});

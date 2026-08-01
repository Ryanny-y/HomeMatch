import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import type { Role } from "@homematch/shared";
import { env } from "../config/env";

/**
 * Token minting and verification. Two different jobs, on purpose.
 *
 * Access tokens are JWTs: verified by signature alone, so the per-request check
 * costs no database round trip. Refresh and verification tokens are opaque
 * random bytes, because they must be revocable — and once a lookup is required
 * anyway, a signature would add a key to rotate and an algorithm-confusion bug
 * class while buying nothing.
 */

const secret = new TextEncoder().encode(env.JWT_SECRET);

const ALGORITHM = "HS256";

export type AccessTokenClaims = {
  userId: string;
  role: Role;
  emailVerified: boolean;
};

export async function signAccessToken(
  claims: AccessTokenClaims,
): Promise<string> {
  return new SignJWT({
    role: claims.role,
    emailVerified: claims.emailVerified,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TTL_MINUTES}m`)
    .sign(secret);
}

/**
 * Returns null rather than throwing: every failure mode here — expired,
 * tampered, wrong algorithm, garbage — means the same thing to the caller
 * (401), and a null keeps that decision in the middleware where it belongs.
 *
 * `algorithms` is pinned. Without it, a token claiming `alg: none` or a
 * different algorithm could be accepted — the classic JWT confusion attack.
 */
export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
    });

    const { sub, role, emailVerified } = payload;

    // The payload is `unknown` as far as the type system is concerned — it came
    // off the wire. Narrow it rather than casting.
    if (typeof sub !== "string") return null;
    if (role !== "renter" && role !== "landlord" && role !== "admin") {
      return null;
    }
    if (typeof emailVerified !== "boolean") return null;

    return { userId: sub, role, emailVerified };
  } catch (error) {
    // Expired is the overwhelmingly common case and is not noteworthy — the
    // client refreshes and moves on. Anything else is worth distinguishing if
    // this ever needs debugging.
    if (error instanceof joseErrors.JWTExpired) return null;
    return null;
  }
}

/**
 * 32 bytes of CSPRNG output, base64url encoded (43 chars).
 *
 * Used for refresh tokens and email verification links. 256 bits means there is
 * nothing to guess and no dictionary to attack — which is exactly why these are
 * stored under SHA-256 rather than argon2.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * SHA-256 hex of a token, for storage and lookup.
 *
 * Fast on purpose. argon2 is slow because passwords are low-entropy and
 * guessable; a 256-bit random token has no such weakness, and this hash runs on
 * every refresh. A slow hash here would be latency with no security return.
 *
 * The raw token exists in exactly one place — the cookie, or the email link. A
 * dump of the token tables yields hex strings and no way back.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

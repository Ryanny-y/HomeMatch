import { randomUUID } from "node:crypto";
import type {
  AuthenticatedUser,
  LoginInput,
  Role,
  SignupInput,
} from "@homematch/shared";
import { env } from "../../shared/config/env";
import { logger } from "../../shared/logger";
import { mailer } from "../../shared/mail/mailer";
import { ConflictError, UnauthorizedError } from "../../shared/errors/AppError";
import { decoyHash, hashPassword, verifyPassword } from "../../shared/security/password";
import {
  generateOpaqueToken,
  hashToken,
  signAccessToken,
} from "../../shared/security/token";
import * as repo from "./auth.repository";
import type { IssuedSession } from "./auth.types";


const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How long a password reset link stays usable.
 *
 * **Sixty minutes is not an arbitrary figure.** `ForgotPasswordForm` tells the
 * user "the link works once and expires in 60 minutes" as a statement of fact,
 * and the reset email repeats it. Changing this without changing both is the
 * app lying to someone at the exact moment they are locked out.
 *
 * Much shorter than the 24h verification window on purpose: this token can
 * change a credential, so its blast radius while live is far larger.
 */
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const REFRESH_GRACE_MS = 10_000;

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toAuthenticatedUser(user: repo.UserDto): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

async function issueTokens(
  user: repo.UserDto,
  familyId: string,
): Promise<IssuedSession> {
  const refreshToken = generateOpaqueToken();

  await repo.createRefreshToken({
    tokenHash: hashToken(refreshToken),
    familyId,
    userId: user.id,
    expiresAt: new Date(Date.now() + env.sessionTtlMs),
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    emailVerified: user.emailVerified,
  });

  return { user: toAuthenticatedUser(user), accessToken, refreshToken };
}

/** Issue and deliver a verification link, replacing any outstanding one. */
async function sendVerification(user: repo.UserDto): Promise<void> {
  const token = generateOpaqueToken();

  await repo.replaceVerificationToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  });

  await mailer.sendVerificationEmail(user.email, token);
}

export async function register(input: SignupInput): Promise<IssuedSession> {
  const email = normaliseEmail(input.email);

  const existing = await repo.findUserByEmail(email);

  if (existing) {
    throw new ConflictError("An account with that email already exists.");
  }

  let user: repo.UserDto;

  try {
    user = await repo.createUser({
      email,
      passwordHash: await hashPassword(input.password),
      fullName: input.fullName.trim(),
      role: input.role,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("An account with that email already exists.");
    }
    throw error;
  }

  await sendVerification(user);

  return issueTokens(user, randomUUID());
}

export async function login(input: LoginInput): Promise<IssuedSession> {
  const email = normaliseEmail(input.email);
  const user = await repo.findUserByEmail(email);

  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await decoyHash()),
  );

  if (!user || !passwordMatches) {
    throw new UnauthorizedError();
  }

  return issueTokens(user, randomUUID());
}

export async function refresh(rawToken: string): Promise<IssuedSession> {
  const row = await repo.findRefreshToken(hashToken(rawToken));

  if (!row) {
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }

  if (row.revokedAt) {
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    // Normal expiry. Deliberately does NOT revoke the family.
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }

  const user = await repo.findUserById(row.userId);

  if (!user) {
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }

  if (row.rotatedAt) {
    const spentAgo = Date.now() - row.rotatedAt.getTime();

    if (spentAgo > REFRESH_GRACE_MS) {
      // Genuine reuse: two parties hold tokens from this family and there is no
      // way to tell which one is talking. Trust neither.
      await repo.revokeFamily(row.familyId);
      logger.warn(
        { userId: row.userId, familyId: row.familyId },
        "Refresh token reuse detected — family revoked",
      );
      throw new UnauthorizedError("Your session has expired. Please sign in again.");
    }

    return issueTokens(user, row.familyId);
  }

  const refreshToken = generateOpaqueToken();

  await repo.rotateRefreshToken({
    currentId: row.id,
    tokenHash: hashToken(refreshToken),
    familyId: row.familyId,
    userId: user.id,
    expiresAt: new Date(Date.now() + env.sessionTtlMs),
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    // Re-read from the database, not carried over from the old token. This is
    // the only point at which a role change takes effect.
    role: user.role,
    emailVerified: user.emailVerified,
  });

  return { user: toAuthenticatedUser(user), accessToken, refreshToken };
}


export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;

  const row = await repo.findRefreshToken(hashToken(rawToken));

  if (!row) return;

  await repo.revokeFamily(row.familyId);
}

/**
 * Revokes every live refresh family for one user.
 *
 * Exported for the admin surface, which must be able to end someone else's
 * sessions without reaching into this feature's repository. The access token
 * they are holding stays valid until it expires — this stops the renewal, which
 * is the most an opaque-refresh design can promise.
 */
export function revokeSessionsFor(userId: string): Promise<{ count: number }> {
  return repo.revokeAllFamiliesForUser(userId);
}

export async function getSession(userId: string): Promise<AuthenticatedUser> {
  const user = await repo.findUserById(userId);

  if (!user) {
    // The token verified but the row is gone — deleted mid-session.
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }

  return toAuthenticatedUser(user);
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const row = await repo.findVerificationToken(hashToken(rawToken));

  if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError(
      "This verification link is no longer valid. Log in and we'll send you a new one.",
    );
  }

  const { count } = await repo.consumeVerificationToken({
    tokenId: row.id,
    userId: row.userId,
  });

  if (count === 0) {
    throw new UnauthorizedError(
      "This verification link is no longer valid. Log in and we'll send you a new one.",
    );
  }
}

export async function resendVerification(rawEmail: string): Promise<void> {
  const user = await repo.findUserByEmail(normaliseEmail(rawEmail));

  if (!user || user.emailVerified) return;

  await sendVerification(user);
}

/**
 * Start a password reset.
 *
 * **Always resolves, whether or not the account exists.** The forgot-password
 * screen already says "if an account exists for X, a link is on its way", and
 * any other behaviour here would make an unauthenticated endpoint into an
 * account-existence oracle — the same rule as `resendVerification`.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const user = await repo.findUserByEmail(normaliseEmail(rawEmail));

  if (!user) return;

  const token = generateOpaqueToken();

  await repo.replacePasswordResetToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  });

  await mailer.sendPasswordResetEmail(user.email, token);
}

/**
 * Finish a password reset.
 *
 * Does **not** issue a session. The reset screen sends the user to the login
 * form afterwards, which means the new password gets exercised immediately —
 * and whoever completes a reset should have to prove they know what they just
 * set, rather than being handed a session by the link alone.
 */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<void> {
  const row = await repo.findPasswordResetToken(hashToken(rawToken));

  // One message for missing, consumed and expired. Distinguishing them tells an
  // attacker holding a stale token whether it was ever real.
  const rejected = new UnauthorizedError(
    "This reset link is no longer valid. Request a new one and it'll work.",
  );

  if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
    throw rejected;
  }

  const { count } = await repo.consumePasswordReset({
    tokenId: row.id,
    userId: row.userId,
    passwordHash: await hashPassword(newPassword),
  });

  if (count === 0) {
    // Lost a race with a simultaneous click on the same link. The other request
    // set the password; this one changed nothing and must not claim otherwise.
    throw rejected;
  }

  /**
   * Every refresh family is revoked inside that transaction, which is what the
   * success screen's "any other devices already signed in have been logged out"
   * refers to.
   *
   * Worth being precise, because the copy slightly overstates it: an access
   * token already issued stays valid until it expires — at most
   * ACCESS_TTL_MINUTES. That is the same accepted window the whole JWT design
   * carries, not something specific to reset. Nothing can refresh past it.
   */
  logger.info({ userId: row.userId }, "Password reset — all sessions revoked");
}

/** Prisma's unique-constraint error, narrowed without importing its error class. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export type { Role };
``
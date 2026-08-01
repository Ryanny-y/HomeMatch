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
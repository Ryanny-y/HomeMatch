import type { Role } from "@homematch/shared";
import { prisma } from "../../lib/prisma";
import { USER_DTO_SELECT } from "./auth.types";

/**
 * Every Prisma call for auth. The service calls these; it never touches the
 * client directly.
 *
 * `select` is explicit everywhere — never `include` a whole row and never
 * return one to a caller that might forward it. `passwordHash` is only selected
 * by the one function whose job is to compare it.
 */

export type UserDto = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  emailVerified: boolean;
};

export type UserWithSecret = UserDto & { passwordHash: string };

export function findUserByEmail(email: string): Promise<UserWithSecret | null> {
  return prisma.user.findUnique({
    where: { email },
    select: { ...USER_DTO_SELECT, passwordHash: true },
  });
}

export function findUserById(id: string): Promise<UserDto | null> {
  return prisma.user.findUnique({
    where: { id },
    select: USER_DTO_SELECT,
  });
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
}): Promise<UserDto> {
  return prisma.user.create({
    data: input,
    select: USER_DTO_SELECT,
  });
}

export function markEmailVerified(userId: string): Promise<unknown> {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
    select: { id: true },
  });
}

// ---------------------------------------------------------------- refresh ---

export type RefreshTokenRow = {
  id: string;
  familyId: string;
  userId: string;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
};

export function findRefreshToken(
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      familyId: true,
      userId: true,
      expiresAt: true,
      rotatedAt: true,
      revokedAt: true,
    },
  });
}

export function createRefreshToken(input: {
  tokenHash: string;
  familyId: string;
  userId: string;
  expiresAt: Date;
}): Promise<unknown> {
  return prisma.refreshToken.create({
    data: input,
    select: { id: true },
  });
}

/**
 * Spend one token and issue its successor, atomically.
 *
 * A transaction because the two halves must not come apart: marking the old one
 * spent without creating the new one logs the user out on a crash, and creating
 * the new one without marking the old spent leaves two live tokens — which the
 * next refresh would correctly read as theft.
 */
export function rotateRefreshToken(input: {
  currentId: string;
  tokenHash: string;
  familyId: string;
  userId: string;
  expiresAt: Date;
}): Promise<unknown> {
  return prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: input.currentId },
      data: { rotatedAt: new Date() },
      select: { id: true },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: input.tokenHash,
        familyId: input.familyId,
        userId: input.userId,
        expiresAt: input.expiresAt,
      },
      select: { id: true },
    }),
  ]);
}

/**
 * Kill an entire login lineage.
 *
 * Used by logout and by reuse detection. `revokedAt: null` in the filter keeps
 * this idempotent — re-revoking a dead family is a no-op rather than a rewrite
 * that would move the timestamp and lose when it actually happened.
 */
export function revokeFamily(familyId: string): Promise<{ count: number }> {
  return prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Every family this user has — every device, every browser.
 *
 * Used by password reset. A reset that leaves an intruder's session alive is
 * theatre: the victim changes their password and the attacker keeps browsing.
 */
export function revokeAllFamiliesForUser(
  userId: string,
): Promise<{ count: number }> {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ----------------------------------------------------------- verification ---

export type VerificationTokenRow = {
  id: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

export function findVerificationToken(
  tokenHash: string,
): Promise<VerificationTokenRow | null> {
  return prisma.verificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, consumedAt: true },
  });
}

/**
 * Issue a verification token, invalidating any outstanding ones first.
 *
 * The UI promises exactly this — "A new verification link is on its way. The
 * previous one no longer works." Deleting rather than marking consumed keeps
 * the table from accumulating rows for users who request several.
 */
export function replaceVerificationToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<unknown> {
  return prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { userId: input.userId } }),
    prisma.verificationToken.create({
      data: input,
      select: { id: true },
    }),
  ]);
}

/**
 * Consume a token and flip the user's flag together.
 *
 * `consumedAt: null` in the where-clause makes this the single-use guard, and
 * it is enforced by the database rather than by a read-then-write in the
 * service — two simultaneous clicks on the same link cannot both succeed.
 */
export function consumeVerificationToken(input: {
  tokenId: string;
  userId: string;
}): Promise<{ count: number }> {
  return prisma
    .$transaction([
      prisma.verificationToken.updateMany({
        where: { id: input.tokenId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: input.userId },
        data: { emailVerified: true },
        select: { id: true },
      }),
    ])
    .then(([consumed]) => consumed);
}

// -------------------------------------------------------- password reset ---

export type PasswordResetTokenRow = {
  id: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

export function findPasswordResetToken(
  tokenHash: string,
): Promise<PasswordResetTokenRow | null> {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, consumedAt: true },
  });
}

/**
 * Issue a reset token, dropping any outstanding ones for that user.
 *
 * Requesting a second link must kill the first: otherwise every reset email
 * ever sent stays live for its full hour, and a link recovered from an old
 * inbox or a shared machine still works.
 */
export function replacePasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<unknown> {
  return prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: input.userId } }),
    prisma.passwordResetToken.create({ data: input, select: { id: true } }),
  ]);
}

/**
 * The whole reset, atomically.
 *
 * Four writes that must not come apart — a crash between them would leave a
 * consumed token with the old password still set, or a changed password with
 * live sessions belonging to whoever prompted the reset:
 *
 *   1. burn the token   2. set the new password
 *   3. mark the address verified   4. revoke every refresh family
 *
 * Step 3 is not a freebie thrown in: following a link sent to that address
 * proves control of the mailbox, which is exactly what verification asks for.
 *
 * `consumedAt: null` in the where-clause is the single-use guard, enforced by
 * the database rather than a read-then-write — two simultaneous clicks on the
 * same link cannot both succeed. The returned `count` is how the service knows
 * whether this call was the one that won.
 */
export function consumePasswordReset(input: {
  tokenId: string;
  userId: string;
  passwordHash: string;
}): Promise<{ count: number }> {
  return prisma
    .$transaction([
      prisma.passwordResetToken.updateMany({
        where: { id: input.tokenId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: input.userId },
        data: { passwordHash: input.passwordHash, emailVerified: true },
        select: { id: true },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ])
    .then(([consumed]) => consumed);
}

import type { Role } from "@homematch/shared";
import { prisma } from "../../lib/prisma";
import { USER_DTO_SELECT } from "./auth.types";

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

export function revokeFamily(familyId: string): Promise<{ count: number }> {
  return prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

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

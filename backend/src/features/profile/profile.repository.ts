import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

/** Every Prisma call for renter preferences. */

export type RenterPreferenceRow = Prisma.RenterPreferenceGetPayload<object>;

/**
 * The columns a renter may write.
 *
 * Derived from Prisma's generated create input rather than hand-listed, so a
 * column added to the model is writable here only after someone decides it
 * should be — and the identity and timestamp columns can never be.
 */
export type RenterPreferenceWrite = Partial<
  Omit<
    Prisma.RenterPreferenceUncheckedCreateInput,
    "id" | "userId" | "createdAt" | "updatedAt"
  >
>;

export function findByUserId(userId: string): Promise<RenterPreferenceRow | null> {
  return prisma.renterPreference.findUnique({ where: { userId } });
}

/**
 * Create on first save, update afterwards.
 *
 * `upsert` rather than read-then-branch in the service: two saves racing would
 * both read "no row", both try to create, and the second would hit the unique
 * index on `userId`. One statement lets Postgres settle it.
 */
export function upsertForUser(
  userId: string,
  data: RenterPreferenceWrite,
): Promise<RenterPreferenceRow> {
  return prisma.renterPreference.upsert({
    where: { userId },
    create: { ...data, userId },
    update: data,
  });
}

/**
 * Stamps `onboardedAt`, once, whether the renter filled the form in or skipped.
 *
 * `updateMany` with `onboardedAt: null` in the *where* rather than a read then a
 * write: it makes the call idempotent in one statement, so a double-submit or a
 * retry cannot move the timestamp. A renter who onboarded in March and edits
 * their profile in September must still read as onboarded in March — this is
 * the date they first got through the gate, not the date they last saved.
 *
 * `upsert` because a renter who skips has no row yet.
 */
export async function markOnboarded(userId: string): Promise<RenterPreferenceRow> {
  await prisma.renterPreference.upsert({
    where: { userId },
    create: { userId, onboardedAt: new Date() },
    update: {},
  });

  await prisma.renterPreference.updateMany({
    where: { userId, onboardedAt: null },
    data: { onboardedAt: new Date() },
  });

  return prisma.renterPreference.findUniqueOrThrow({ where: { userId } });
}

import type { Role } from "@homematch/shared";
import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/shared/security/password";

/**
 * Test data builders. Tests state only what they care about; everything else
 * comes from here.
 *
 * The point is that a test reading `createUser({ role: "landlord" })` says
 * "this test is about landlords" — whereas an inline literal with six fields
 * buries the one that matters among five that don't.
 */

export const TEST_PASSWORD = "correct-horse-9";

let counter = 0;

/** Unique per call, so parallel-safe and never colliding on the email index. */
function uniqueEmail(): string {
  counter += 1;
  return `user${counter}.${Date.now()}@example.test`;
}

export async function createUser(
  overrides: Partial<{
    email: string;
    password: string;
    fullName: string;
    role: Role;
    emailVerified: boolean;
  }> = {},
): Promise<{ id: string; email: string; role: Role }> {
  const email = (overrides.email ?? uniqueEmail()).toLowerCase();

  const user = await prisma.user.create({
    data: {
      email,
      fullName: overrides.fullName ?? "Test Person",
      role: overrides.role ?? "renter",
      emailVerified: overrides.emailVerified ?? false,
      passwordHash: await hashPassword(overrides.password ?? TEST_PASSWORD),
    },
    select: { id: true, email: true, role: true },
  });

  return user;
}

/**
 * Reads a cookie value out of a supertest `set-cookie` header.
 *
 * Returns the raw value only — the flags are asserted separately, by the test
 * that actually cares about them.
 */
export function readCookie(
  setCookie: string[] | undefined,
  name: string,
): string | undefined {
  const header = setCookie?.find((c) => c.startsWith(`${name}=`));
  if (!header) return undefined;

  const value = header.split(";")[0]?.slice(name.length + 1);
  return value && value.length > 0 ? value : undefined;
}

/** The `Cookie` request header for a set of name/value pairs. */
export function cookieHeader(pairs: Record<string, string | undefined>): string {
  return Object.entries(pairs)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

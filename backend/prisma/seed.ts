import "dotenv/config";
import { env } from "../src/shared/config/env";
import { prisma, disconnectPrisma } from "../src/lib/prisma";
import { hashPassword } from "../src/shared/security/password";

/**
 * Seeds the admin account.
 *
 * `signupSchema` accepts only `renter | landlord`, so an admin cannot be
 * created through the API by design — this script is the only way one exists.
 * The roadmap calls for it explicitly so the founder can log in and seed
 * listings.
 *
 * The password comes from the environment and is never written here. "No
 * secrets in code" is absolute, and a committed admin credential is the worst
 * kind: it grants the most and gets noticed the least.
 *
 * Idempotent — safe to re-run. An existing admin is left alone rather than
 * having its password reset, so running this against an environment where the
 * password was rotated does not quietly undo that.
 */
async function main(): Promise<void> {
  const email = env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set to seed the admin account.",
    );
  }

  if (password.length < 12) {
    // The one account that can do everything should not be behind a weak
    // password because a placeholder got left in an env file.
    throw new Error("ADMIN_SEED_PASSWORD must be at least 12 characters.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing) {
    console.log(`Admin already exists (${email}, role: ${existing.role}) — leaving it alone.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      fullName: "HomeMatch Admin",
      role: "admin",
      passwordHash: await hashPassword(password),
      // The seeded admin skips verification: there is no inbox behind
      // admin@homematch.local, and it exists to load listings, not to be
      // onboarded.
      emailVerified: true,
    },
    select: { id: true, email: true },
  });

  console.log(`Seeded admin: ${user.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void disconnectPrisma());

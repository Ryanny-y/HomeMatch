import { prisma, disconnectPrisma } from "../../src/lib/prisma";

/**
 * Wipes every table between tests.
 *
 * TRUNCATE rather than deleteMany: it is one statement regardless of row count,
 * and `CASCADE` handles the foreign keys without the caller having to know the
 * deletion order. `RESTART IDENTITY` keeps sequences from drifting upward
 * across a long run.
 *
 * The table list is read from the catalogue rather than hardcoded, so a table
 * added in a later migration is cleaned up without anyone remembering to add it
 * here — a stale list leaves rows behind and produces failures that look like
 * flakiness.
 *
 * `_prisma_migrations` is excluded deliberately: truncating it would make
 * Prisma think the database is unmigrated.
 */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

/**
 * Closes the pool. Call in `afterAll`.
 *
 * Without it the run hangs on an open handle — and `backend/CLAUDE.md` rules
 * out papering over that with a forced exit.
 */
export async function closeDatabase(): Promise<void> {
  await disconnectPrisma();
}

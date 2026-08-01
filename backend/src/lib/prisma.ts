import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../shared/config/env";
import { PrismaClient } from "../generated/prisma/client";

/**
 * The single PrismaClient. Import this; never construct another.
 *
 * `new PrismaClient()` inside a feature exhausts the connection pool — each
 * instance opens its own, and nothing tears them down.
 *
 * **Prisma 7 note:** the connection string no longer comes from the schema
 * file. `url` was removed from the datasource block (P1012), so migrate reads
 * it from `prisma.config.ts` and the runtime client gets an explicit driver
 * adapter instead. That is why this file, and not the schema, is where
 * DATABASE_URL enters the runtime.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  // Errors and warnings only. Query logging would put parameter values —
  // including password hashes on insert — into the log stream.
  log: env.isProduction ? ["error"] : ["error", "warn"],
});

/**
 * Called by the signal handlers in `server.ts`.
 *
 * Without this the pool keeps the event loop alive and the process never exits
 * on SIGTERM — which on ECS means the task is killed after the stop timeout
 * instead of shutting down cleanly.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

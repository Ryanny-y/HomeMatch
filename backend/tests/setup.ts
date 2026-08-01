import { resolve } from "node:path";
import { config } from "dotenv";

/**
 * Loads `.env.test` before anything else imports `shared/config/env`.
 *
 * This has to run first and it has to override. `env.ts` parses `process.env`
 * at import time, so by the time any test file loads the app the configuration
 * is already fixed — pointing it at the dev database after the fact is not
 * possible.
 *
 * `override: true` matters because `env.ts` also does `import "dotenv/config"`,
 * which reads `.env`. dotenv does not overwrite variables that are already set,
 * so loading the test file here first is what makes it win. Without the
 * override flag a stray shell variable could silently aim the suite at the dev
 * database — and the truncate helper would then wipe real data.
 */
config({ path: resolve(process.cwd(), ".env.test"), override: true });

if (!process.env.DATABASE_URL?.includes("homematch_test")) {
  // Fail loudly rather than run. `backend/CLAUDE.md` forbids testing against
  // the dev or prod database, and `resetDatabase()` truncates every table it
  // is pointed at — a misconfiguration here is destructive, not just wrong.
  throw new Error(
    `Refusing to run tests: DATABASE_URL is not the test database (${process.env.DATABASE_URL ?? "unset"})`,
  );
}

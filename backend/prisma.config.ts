import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 reads its CLI configuration from here rather than from a `prisma`
 * block in package.json.
 *
 * `dotenv/config` is imported explicitly at the top: Prisma 7 no longer loads
 * `.env` by itself, so without this line `env("DATABASE_URL")` resolves to
 * undefined and `migrate` fails with a confusing "datasource not found".
 *
 * `schema` points at the folder, not a file — that is what enables the
 * multi-file layout `backend/CLAUDE.md` requires.
 */
export default defineConfig({
  schema: "prisma/schema",
  // Prisma 7 removed `url` from the datasource block in schema files, so the
  // connection string for migrate/introspect lives here. The runtime client
  // does not read this — it gets a driver adapter (src/lib/prisma.ts).
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    // Seeds the admin account. Run explicitly with `prisma db seed`; it is not
    // wired into `migrate deploy`, because production migrations must not
    // depend on a seed script succeeding.
    seed: "tsx prisma/seed.ts",
  },
});

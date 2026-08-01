import { defineConfig } from "vitest/config";

/**
 * Two kinds of test live here and they have incompatible concurrency needs.
 *
 * Unit tests mock `lib/prisma` and touch nothing shared, so they run in
 * parallel. Integration tests hit one real Postgres database and truncate it
 * between tests — run those in parallel and they delete each other's rows,
 * producing failures that move around between runs.
 *
 * Rather than encode that in config and hope, the split is a command:
 *
 *   npm test -w backend                          # everything, serially — safe default
 *   npx vitest run src/features/**\/*.service.test.ts   # unit only, parallel
 *
 * `fileParallelism: false` is the safe default because a wrong answer here
 * fails intermittently, and an intermittent test suite is worse than a slow one.
 * Override per-run with `--no-file-parallelism=false` when running only units.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Explicit imports of `describe`/`it`/`expect` rather than globals, so
    // tsconfig.tools.json needs no `vitest/globals` types entry and a reader
    // can see where the helpers come from.
    globals: false,
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    // Restores spies between tests so one test's stub cannot leak into the
    // next. Replaces the `jest.resetAllMocks()` in beforeEach convention.
    restoreMocks: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // A hanging handle should fail loudly, not be papered over with a forced
    // exit. If the suite hangs, something is not disconnecting — fix that.
    pool: "forks",
  },
});

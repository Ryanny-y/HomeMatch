# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

HomeMatch AI — an apartment **decision** platform for Quezon City / Metro Manila. It is not a listing site: the differentiators (true monthly cost, deterministic match score + LLM explanation, AI comparison) are the product. `docs/HomeMatch_Context.md` is the durable "what and why" and should be read before any product or schema decision; `docs/HomeMatch_AI_Build_Roadmap.md` is the actual build spec (8 stages); `docs/HomeMatch_AI_Vision.md` is aspirational north star, **not** a build spec.

Two rules from those docs that change how you should work here:
- **Tier 1 features get built and polished; Tier 3 gets a design doc, never dead UI.** Do not scaffold a button for something that isn't wired end to end.
- **Enrichment fields are the product.** Cost breakdown, commute anchors, barangay/flood-risk fields belong in the first listings migration as structured columns — never as notes bolted on later.

Current state: Stage 0 (walking skeleton). The backend serves only `GET /api/health`; the frontend is still the create-next-app template. There is no Prisma schema, no `src/features/`, and no test suite yet.

## Monorepo layout

npm workspaces: `backend`, `frontend`, `packages/*`.

```
backend/           Express 5 + TypeScript API (Prisma planned)
frontend/          Next.js 16 App Router + Tailwind 4
packages/shared/   @homematch/shared — types/constants used by BOTH sides
docs/              vision, context, roadmap
docker-compose.yml Postgres + Adminer + MinIO for local dev
```

### The build-order constraint (most common source of confusion)

`@homematch/shared` is a **compiled** package: its `main`/`types` point at `dist/`, not `src/`. The workspace symlink resolves to the built output, so **the backend cannot typecheck or run until `packages/shared` has been built at least once.** Every root script that touches the backend chains `build:shared` first for this reason. When editing shared types during a session, run `npm run dev:shared` in a second terminal (tsc watch) instead of rebuilding by hand.

Shared code that both sides must agree on — the response envelope types, `ERROR_CODES` — lives here and nowhere else. Do not redeclare an error code string inline on either side.

## Commands

Run from the repo root:

```bash
npm run dev:backend      # builds shared, then tsx watch on backend
npm run dev:frontend     # next dev
npm run dev:shared       # tsc --watch on packages/shared
npm run typecheck        # shared build + backend tsc --noEmit
npm run build:backend    # shared + prisma generate + tsc
```

Per workspace:

```bash
npm test -w backend                    # vitest run
npm run test:watch -w backend
npm run lint -w frontend               # eslint (flat config)
npm run build -w frontend
npm run prisma:migrate -w backend      # prisma migrate dev
```

Single test file / single test (from `backend/`):

```bash
npx vitest run src/features/listings/__tests__/listings.service.test.ts
npx vitest run -t "rejects a listing over budget"
npx vitest run --no-file-parallelism    # required for integration tests (shared test DB)
```

### CI

`.github/workflows/ci.yml` runs on every push and on PRs into `main`: lint → typecheck →
test → build, in one job against a Postgres 17 service container.

Two things it does that are easy to forget when running checks by hand, because both produce
output that is gitignored and therefore absent on a fresh clone:

- **`npm run build:shared` first.** `@homematch/shared` resolves through its compiled `dist/`,
  so nothing on either side typechecks until it has been built once.
- **`npm run prisma:generate -w backend`.** The client is generated into `src/generated`,
  which is gitignored.

CI supplies configuration through the workflow's `env:` block rather than a file, since `.env`
and `.env.test` are both gitignored. `src/shared/config/env.ts` is fail-fast, so **adding a
required key there breaks CI until the workflow is updated too.**

The backend has no ESLint config; `npm run typecheck` (which covers `src`, plus `tests/`,
`scripts/` and the seed via `tsconfig.tools.json`) is its lint gate. Adding ESLint there is an
open improvement.

To reproduce a CI failure locally, run the steps in workflow order — `npm test -w backend`
already chains `prisma migrate deploy` against the test database.

## Local infrastructure

`docker compose up -d` starts, on deliberately non-default ports (this machine runs a DB container per project):

| Service | Address | Credentials |
|---|---|---|
| Postgres | `localhost:5433` | `homematch` / `homematch_dev_password`, dbs `homematch` + `homematch_test` |
| Adminer | http://localhost:7071/?pgsql=postgres | same (the `?pgsql=` is required — Adminer defaults to MySQL) |
| MinIO (S3) | `localhost:9000`, console `:9001` | same; buckets `homematch-dev`, `homematch-test` |

Adminer and MinIO are bound to `127.0.0.1` on purpose. Keep it that way.

MinIO stands in for S3/R2 — the backend uses `@aws-sdk/client-s3` against it unchanged; only endpoint and credentials differ in production. `S3_FORCE_PATH_STYLE` must stay `true` for MinIO (no per-bucket DNS).

## Backend conventions

`backend/CLAUDE.md` is the authoritative ruleset (feature-based structure, thin controllers, Zod-at-the-boundary via shared `validate` middleware, repository-owned Prisma calls, typed errors + one global handler, testing strategy). Read it before writing backend code. Points worth knowing up front:

- **`app.ts` vs `server.ts`** — `app.ts` exports the assembled Express app and never calls `listen()`, so supertest can import it. `server.ts` is the only place that binds a port and owns graceful shutdown. Never call `listen()` in a test.
- **Config is fail-fast.** `src/shared/config/env.ts` parses `process.env` with Zod at import time and throws on anything missing. Add new config there, never via a scattered `process.env` read. `FRONTEND_ORIGIN` is comma-separated and explicitly rejects `*` (credentialed CORS).
- **Express 5**, so async handler rejections reach the error handler on their own — do not add `express-async-handler`.
- **Logging** is pino via `src/shared/logger.ts`, with cookie/authorization headers redacted. No `console.log`.
- Every response — success and error — goes through `ok()` / `fail()` in `src/shared/response/envelope.ts`. Pagination uses the single fixed `{ page, pageSize, total }` meta shape.

## Frontend conventions

`frontend/CLAUDE.md` is the authoritative ruleset (feature slices in `src/features/`, Zod at the boundary, one throwing API client, strict TypeScript, accessibility floor). Read it before writing frontend code. Points worth knowing up front:

- **This is Next.js 16**, which has breaking changes relative to training data. Read the relevant guide in `frontend/node_modules/next/dist/docs/` rather than relying on remembered APIs — `params` and `searchParams` are Promises and must be awaited.
- **Tailwind 4 is configured CSS-first** through `@theme` in `src/app/globals.css`; there is no `tailwind.config.js`. Custom utilities use `@utility`, not bare classes in `@layer components`.
- **Three rules in that file are deliberately not adopted yet** — shadcn/ui, TanStack Query, and TanStack Form. It carries an adoption-status table saying so; check it before "fixing" code to match a rule that isn't live.
- `src/app/` holds routes only. A route composes feature components; it never implements them.

## Architecture decisions already locked

Changing these needs a deliberate discussion, not an incidental refactor:

- **Auth:** JWT access + refresh in httpOnly, SameSite cookies, with refresh rotation. Redis-backed sessions were the runner-up and remain a valid pivot.
- **RBAC from day one:** `renter`, `landlord`, `admin`. The founder operates as `admin` to seed listings.
- **Hybrid AI:** deterministic rules for anything scored or priced (match score, true cost); the LLM only writes the human-readable explanation, and every claim it makes must be traceable to a real record field. No hallucinated reasons.
- **Deploy every stage** — Docker → ECR → ECS Fargate. "Deployable" must never drift more than one stage behind "built."

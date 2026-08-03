# CLAUDE.md — Project Root

Guidance for Claude Code (claude.ai/code) across this repository. Loaded in **every**
session, so it holds only what is true repo-wide: identity, commands, the shared
contract, and the workflow. Stack mechanics live in the scoped files.

---

## PROJECT

- **Name:** HomeMatch AI
- **What it is:** An apartment **decision** platform for Quezon City / Metro Manila — not a listing site
- **Type:** Full-stack npm-workspaces monorepo
- **Purpose:** Portfolio-grade product, built and deployed stage by stage
- **Stack:** Next.js 16 + Express 5 + Prisma + Postgres + TypeScript

Competitors answer "what apartments exist?" HomeMatch answers "which apartment is best
for *me*?" The differentiators — true monthly cost, deterministic match score + LLM
explanation, AI comparison — **are** the product. Every feature must pass one filter:
does this help someone make a better renting decision? If not, it is cut.

### Source documents

Read before any product or schema decision — do not infer product intent from code:

| Doc | What it is | Authority |
|---|---|---|
| `context/HomeMatch_Context.md` | The durable "what and why" | Read first for product/schema decisions |
| `context/HomeMatch_AI_Build_Roadmap.md` | The actual build spec, 8 stages (0–7) | The build order of record |
| `PRODUCT.md` | Users, platform, product purpose | Design-audience decisions |
| `context/HomeMatch_AI_Vision.md` | Aspirational north star | **Not** a build spec — do not build from it |

Three rules from those docs that change how you work here:

- **Tier 1 gets built and polished; Tier 3 gets a design doc, never dead UI.** Do not scaffold a button for something that isn't wired end to end.
- **Vertical slices, not stubs.** To "pitch" a feature, build one path that works end-to-end.
- **Enrichment fields are the product.** Cost breakdown, commute anchors, barangay/flood-risk fields belong in the first listings migration as structured columns — never as notes bolted on later.

### Current state

Stages 0–1 are substantially built: auth (JWT access + rotating refresh, email
verification, password reset), RBAC (`Role` enum, default `renter`), a Prisma schema split
across `backend/prisma/schema/`, Vitest suites, and CI. `backend/src/features/auth/` and
`frontend/src/features/{auth,landing}/` are the reference implementations — **match their
patterns before inventing new ones.**

Stage 2 (Listings Core + Media Uploads) is the next build. There is no listings schema, no
listings feature, and no seed catalog yet. Several `(shell)` routes exist as shells only.

---

## COMMANDS

These are how work gets verified (see WORKFLOW). Run from the repo root:

```bash
npm run dev:backend      # builds shared, then tsx watch on backend
npm run dev:frontend     # next dev
npm run dev:shared       # tsc --watch on packages/shared
npm run typecheck        # shared build + backend tsc --noEmit
npm run build:backend    # shared + prisma generate + tsc
```

Per workspace:

```bash
npm test -w backend                    # migrate test DB, then vitest run
npm run test:watch -w backend
npm run typecheck -w backend           # src + tsconfig.tools.json (tests, scripts, seed)
npm run lint -w frontend               # eslint (flat config)
npm run build -w frontend
npm run prisma:migrate -w backend      # prisma migrate dev
npm run prisma:studio -w backend
```

Single test file / single test (from `backend/`):

```bash
npx vitest run src/features/auth/__tests__/auth.service.test.ts
npx vitest run -t "rejects a listing over budget"
npx vitest run --no-file-parallelism    # required for integration tests (shared test DB)
```

**The backend has no ESLint config** — `npm run typecheck` is its lint gate. Adding ESLint
there is an open improvement, not a bug to fix mid-feature.

---

## CONFIG LOADING

- This file = universal rules for the whole repo.
- `backend/CLAUDE.md` loads for backend work; `frontend/CLAUDE.md` for frontend work.
- **More specific scope wins on conflict** (subdirectory > root).
- The scoped files are authoritative for their side. Read the relevant one *before* writing code there; this file only surfaces the points most often missed.

```
HomeMatch/
  CLAUDE.md              # this file — universal rules
  PRODUCT.md             # users, platform, product purpose
  context/               # vision, context, roadmap
  backend/               # Express 5 + TypeScript + Prisma
    CLAUDE.md
    prisma/schema/       # split schema: schema.prisma, user.prisma, session.prisma
  frontend/              # Next.js 16 App Router + Tailwind 4
    CLAUDE.md
  packages/shared/       # @homematch/shared — used by BOTH sides
  docker/                # postgres init
  docker-compose.yml     # Postgres + Adminer + MinIO
```

### The build-order constraint (most common source of confusion)

`@homematch/shared` is a **compiled** package: its `main`/`types` point at `dist/`, not
`src/`. The workspace symlink resolves to the built output, so **nothing on either side
typechecks or runs until `packages/shared` has been built at least once.** Every root
script that touches the backend chains `build:shared` first for this reason.

When editing shared types during a session, run `npm run dev:shared` in a second terminal
(tsc watch) instead of rebuilding by hand.

---

## SHARED CONTRACT (single source of truth)

`packages/shared` is the seam between backend and frontend. The envelope types and
`ERROR_CODES` live there **and nowhere else.**

```ts
type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: ErrorCode; message: string; details?: unknown } | null;
  meta?: Record<string, unknown>;
};
```

- Every response — success and error — goes through `ok()` / `fail()` in `backend/src/shared/response/envelope.ts`.
- Pagination uses the single fixed `{ page, pageSize, total }` meta shape.
- Error `code`s come from `ERROR_CODES` in the shared package. **Never** an inline magic string on either side.
- The shared schema is the source of truth for types on both sides — derive, don't duplicate.

---

## ENGINEERING PRINCIPLES (both sides)

- **Feature-based architecture everywhere.** A feature owns its full slice; no cross-feature reaching into internals.
- **Validate at boundaries** with Zod. Services and components trust already-validated input.
- **Strict typing.** No `any`, no raw types. Explicit return types on exported functions.
- **Centralized, typed error handling** mapped to the envelope. No ad-hoc error shapes.
- Small, composable, single-responsibility units. Consistency over cleverness.

---

## COMMENTS

Applies to both workspaces; the scoped files restate it in their own terms.

- Comment only what the code cannot say for itself. If a comment restates the line below it, **delete the comment, not the line.**
- No narration (`// increment the counter`), no obvious labels, no commented-out code left behind.
- Reach for a clearer name, a smaller function, or an extracted well-named variable **before** reaching for a comment. A comment is what you write when the code genuinely cannot carry the meaning.
- Do write one when the reason lives outside the code: non-obvious logic, a complex algorithm, a design decision worth defending, a workaround (link the issue), an edge case, or an external constraint — a Prisma quirk, a Next.js 16 behaviour, a Resend status code that means something specific.
- Explain **why**, not **what**. The code already says what.
- When you touch a file, delete or rewrite comments that have become redundant, obvious, or stale. A comment that no longer matches the code is worse than no comment at all.

---

## WORKFLOW (Claude sessions)

- **Understand before editing.** Read the relevant feature slice and the Prisma schema before changing them.
- **Match the existing patterns** in the touched feature before introducing new ones. `features/auth/` is the reference on both sides.
- **Definition of done:** typecheck, lint, and tests pass — run them, don't assume. Add or update tests for changed behavior.
- **Don't invent APIs, columns, env vars, or routes.** Check the schema and `packages/shared` first; ask if unknown.
- Prefer editing existing files over creating parallel ones. Keep diffs small and focused; don't refactor unrelated code in the same change.
- Use npm and the existing scripts. Don't switch tooling.
- **Ask before:** DB schema changes/migrations, adding dependencies, or cross-cutting refactors.

---

## GIT / BRANCHING / PR

- **Branch per feature.** Sync `main` (pull latest), then create and switch to a new branch — **never work directly on `main`.**
- **Branch before the first edit, not before the first commit.** Cutting the branch is the first action of the task, ahead of any file write. Check `git branch --show-current` before editing anything; if the answer is `main`, stop and branch.
- **If the work changes character mid-branch, cut a new branch.** A `docs/*` branch that starts growing a schema, an API, or a feature slice has become a second unit of work — the prefix is a promise about what the diff contains. Branch again rather than letting the first one absorb it.
- Branch naming: `feat/<feature>`, `fix/<feature>`, `refactor/<scope>`, `chore/<scope>`, `docs/<scope>` (kebab-case).
- Commit incrementally as work progresses.
- **PR only on my approval.** When an implementation is complete, present it and wait. Do NOT open a PR automatically.
- Once confirmed, open a PR from the feature branch into `main` for exactly those changes, including: a conventional-commit-style title, a short summary of what changed and why, and confirmation that typecheck + lint + tests pass.
- One feature per branch, one PR per feature. Don't bundle unrelated changes.
- Don't push directly to `main`, don't merge your own PR, don't force-push shared branches.

### COMMITS

- Conventional commits: `feat|fix|refactor|chore|test|docs(scope): summary`.
- One logical change per commit. No build artifacts, `.env`, or secrets.

---

## CI

`.github/workflows/ci.yml` runs on every push and on PRs into `main`: lint → typecheck →
test → build, in one job against a Postgres 17 service container.

Two steps are easy to forget when running checks by hand, because both produce output that
is gitignored and therefore absent on a fresh clone:

- **`npm run build:shared` first** — `@homematch/shared` resolves through its compiled `dist/`.
- **`npm run prisma:generate -w backend`** — the client is generated into `src/generated`, which is gitignored.

CI supplies configuration through the workflow's `env:` block rather than a file, since
`.env` and `.env.test` are both gitignored. `src/shared/config/env.ts` is fail-fast, so
**adding a required key there breaks CI until the workflow is updated too.**

To reproduce a CI failure locally, run the steps in workflow order — `npm test -w backend`
already chains `prisma migrate deploy` against the test database.

---

## LOCAL INFRASTRUCTURE

`docker compose up -d` starts, on deliberately non-default ports (this machine runs a DB
container per project):

| Service | Address | Credentials |
|---|---|---|
| Postgres | `localhost:5433` | `homematch` / `homematch_dev_password`, dbs `homematch` + `homematch_test` |
| Adminer | http://localhost:7071/?pgsql=postgres | same (the `?pgsql=` is required — Adminer defaults to MySQL) |
| MinIO (S3) | `localhost:9000`, console `:9001` | same; buckets `homematch-dev`, `homematch-test` |

- Adminer and MinIO are bound to `127.0.0.1` **on purpose. Keep it that way.**
- MinIO stands in for S3/R2 — the backend uses `@aws-sdk/client-s3` against it unchanged; only endpoint and credentials differ in production. `S3_FORCE_PATH_STYLE` must stay `true` for MinIO (no per-bucket DNS).

---

## BACKEND — points worth knowing up front

`backend/CLAUDE.md` is authoritative (feature structure, thin controllers, Zod via the
shared `validate` middleware, repository-owned Prisma calls, typed errors + one global
handler, testing strategy). Read it before writing backend code.

- **`app.ts` vs `server.ts`** — `app.ts` exports the assembled Express app and never calls `listen()`, so supertest can import it. `server.ts` is the only place that binds a port and owns graceful shutdown. **Never call `listen()` in a test.**
- **Config is fail-fast.** `src/shared/config/env.ts` parses `process.env` with Zod at import time and throws on anything missing. Add new config there, never via a scattered `process.env` read. `FRONTEND_ORIGIN` is comma-separated and explicitly rejects `*` (credentialed CORS).
- **Express 5** — async handler rejections reach the error handler on their own. Do not add `express-async-handler`.
- **Logging** is pino via `src/shared/logger.ts`, with cookie/authorization headers redacted. **No `console.log`.**
- Prisma calls belong in the repository layer. The schema is split across `prisma/schema/`.

---

## FRONTEND — points worth knowing up front

`frontend/CLAUDE.md` is authoritative (feature slices in `src/features/`, Zod at the
boundary, one throwing API client, strict TypeScript, accessibility floor). Read it before
writing frontend code.

- **This is Next.js 16**, which has breaking changes relative to training data. Read the relevant guide in `frontend/node_modules/next/dist/docs/` rather than relying on remembered APIs — `params` and `searchParams` are Promises and **must be awaited.**
- **Tailwind 4 is configured CSS-first** through `@theme` in `src/app/globals.css`; there is no `tailwind.config.js`. Custom utilities use `@utility`, not bare classes in `@layer components`.
- **Three rules in that file are deliberately not adopted yet** — shadcn/ui, TanStack Query, TanStack Form. It carries an adoption-status table saying so; **check it before "fixing" code to match a rule that isn't live.**
- `src/app/` holds routes only. A route composes feature components; it never implements them.

---

## ARCHITECTURE DECISIONS ALREADY LOCKED

Changing these needs a deliberate discussion, not an incidental refactor:

- **Auth:** JWT access + refresh in httpOnly, SameSite cookies, with refresh rotation. Redis-backed sessions were the runner-up and remain a valid pivot.
- **RBAC from day one:** `renter`, `landlord`, `admin`. The founder operates as `admin` to seed listings.
- **Hybrid AI:** deterministic rules for anything scored or priced (match score, true cost); the LLM only writes the human-readable explanation, and **every claim it makes must be traceable to a real record field. No hallucinated reasons.**
- **Deploy every stage** — Docker → ECR → ECS Fargate. "Deployable" must never drift more than one stage behind "built."

---

## DO NOT (project-wide)

- No divergent response shapes — envelope only, via `ok()` / `fail()`.
- No duplicating types across frontend/backend when `packages/shared` has them; no inline error-code strings.
- No dead UI for unbuilt features — Tier 3 gets a design doc instead.
- No enrichment data as free-text notes when it should be a structured column.
- No committing secrets or `.env`.
- No broad/unrelated refactors bundled into feature work.
- No new dependency without a reason and approval.
- No bypassing the validation or error-handling conventions "just this once."
- No comments that restate the code; no commented-out code; no stale comments after an edit.
- No marking work "done" with failing typecheck, lint, or tests.

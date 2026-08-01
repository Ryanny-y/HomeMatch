# Backend CLAUDE.md

Scope: backend code only. Applies to every backend session for this stack.
Stack: Node.js + Express + Prisma + PostgreSQL + TypeScript.
Auth: custom JWT — 15-minute access token + rotating opaque refresh token, both
in httpOnly cookies, with reuse detection. No `Authorization` header anywhere.

---

## UNIVERSAL RULES

- Feature-based (package-by-feature), never layer-by-type at the top level. A feature owns its routes/controller, service, repository, schemas/DTOs, and tests.
- Controllers/routes are thin: validate input → call service → shape response. No business logic, no DB access, no cross-feature calls.
- Business logic lives in services. Data access lives in repositories. Keep these layers separated.
- One response envelope for ALL endpoints — success and error. Never return bare entities or ad-hoc shapes.
- Validate at the boundary (route middleware) before anything touches the service. Services trust their inputs.
- Never leak Prisma models to the client. Map to a response DTO/type.
- Centralized error handling. Handlers throw typed errors; a single global handler converts them to the envelope. No try/catch in every handler.
- Centralize config/env access in one module. No scattered `process.env` reads across features.
- Use a structured logger, never `console.log`. Never log secrets, tokens, or full request bodies.
- No secrets, keys, or connection strings in code. Fail fast on missing required config at startup.
- Every request and response has an explicit type/shape.

---

## FOLDER LAYOUT (per feature)

```
prisma/
  schema/
    schema.prisma           # datasource + generator ONLY, no models
    <domain>.prisma         # one file per domain area: its models + its enums
  migrations/
src/
  features/
    <feature>/
      <feature>.routes.ts       # router + middleware wiring only
      <feature>.controller.ts   # req/res, call service
      <feature>.service.ts      # business logic
      <feature>.repository.ts   # Prisma calls only
      <feature>.schema.ts       # Zod schemas (input + output)
      <feature>.types.ts        # inferred + domain types, DTOs
      __tests__/
        <feature>.service.test.ts     # unit
        <feature>.routes.test.ts      # integration
  shared/
    middleware/                 # errorHandler, requireAuth, validate, rateLimit
    errors/                     # AppError + subclasses
    response/                   # ApiResponse helpers
    config/                     # env parsing (validated)
    logger.ts
  lib/
    prisma.ts                   # the single PrismaClient instance
  app.ts                        # express app assembly (NO listen)
  server.ts                     # bootstrap + app.listen()
tests/
  setup.ts                      # global test setup
  helpers/
    db.ts                       # reset/truncate helpers
    factories.ts                # test data builders
```

`app.ts` and `server.ts` are separate on purpose: `app.ts` exports the
configured Express instance (importable by tests via supertest), `server.ts` is
the only place that calls `app.listen()`.

---

## RESPONSE ENVELOPE

```ts
type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: Record<string, unknown>;
};

// helpers in shared/response/
ok<T>(data): { success: true, data, error: null }
fail(code, message, details?): { success: false, data: null, error: {...} }
```

- Controllers return `res.status(n).json(ok(data))`. Errors are thrown, not returned.
- For list endpoints, `meta` carries pagination in a fixed shape: `{ page, pageSize, total }`. Do not invent per-endpoint pagination shapes.
- Error `code`s come from a shared const/enum, not inline strings.

---

## VALIDATION & TYPING (Zod at the boundary)

- Define `Body`, `Params`, `Query` schemas in `<feature>.schema.ts`.
- Validation runs in a shared `validate` middleware (`shared/middleware/`), wired per-route in `<feature>.routes.ts` — NOT via `.parse()` inside controllers. The middleware parses the schema, replaces `req.body`/`req.params`/`req.query` with the parsed (typed) values, and passes control on. A `ZodError` bubbles to the global handler as a 422.
- Controllers therefore receive already-validated, correctly-typed input and never call `.parse()` themselves.
- Derive types with `z.infer<>` — do not hand-write a parallel type.

Route wiring pattern (order matters: auth → validate → controller):

```ts
// <feature>.routes.ts
router.post(
  "/",
  requireAuth,                                // auth middleware first
  validate({ body: create<Feature>Schema }),  // then validation
  <feature>Controller.create,                 // thin controller last
);
```

- `tsconfig`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`.
- `any` is banned. Use `unknown` + narrowing. No `@ts-ignore` / `@ts-expect-error` without a comment justifying it.
- Explicit return type on every exported function and every service/repository method.
- No non-null assertions (`!`) to silence the compiler — narrow properly.

---

## ASYNC HANDLERS

- **Express 5:** rejected promises from async handlers are forwarded to the error handler automatically. Do NOT add `express-async-handler` — it is redundant.
- **Express 4:** wrap every async controller in `express-async-handler` (or an equivalent wrapper) so rejections reach the global handler.
- Check the Express major version in `package.json` before choosing; the wrong choice means rejections are silently swallowed.

---

## PRISMA

- **Split the schema across files — never one giant `schema.prisma`.** Use the multi-file schema layout: `prisma/schema/` holds `schema.prisma` with the `datasource` and `generator` blocks *only*, and one `<domain>.prisma` file per domain area (`user.prisma`, `listing.prisma`, `booking.prisma`). Prisma concatenates the folder, so cross-file relations work with no imports and no changes to how you write models.
- **One domain per file; co-locate an enum only with the model that owns it.** An enum used by exactly one model (or by one tight cluster of models in that same file) lives beside it. An enum shared across domains goes in a shared file (`enums.prisma`) — do not duplicate it, and do not drag an unrelated model into a file just because it references the enum. If a file starts covering two unrelated concerns, split it.
- **Single client instance.** Instantiate `PrismaClient` exactly once in `lib/prisma.ts` and import it everywhere. Never `new PrismaClient()` inside a feature — it exhausts the connection pool.
- **Repositories own all Prisma calls.** Services call repositories, not Prisma directly. A repository may be collapsed into the service only when it is a pure passthrough with zero query logic to hide — otherwise keep it separate.
- **`select` / `include` discipline.** Fetch only the fields you need with explicit `select`. Never return a raw row to the client; map to a DTO. This is the first line of defense for "never leak persistence models."
- **Transactions.** Any operation that performs multiple related writes runs inside `prisma.$transaction`. Never leave a multi-write flow partially committed.
- **Migrations.** Schema changes go through `prisma migrate`. Never hand-edit the database or rely on `db push` for anything that ships.
- **PostgreSQL specifics.** Use `@db.` native types where they matter (`@db.Decimal` for money — never `Float`; `@db.Citext` or a normalized column for case-insensitive lookups). Add `@@index` for every column you filter or sort on in a list endpoint. Enums are Prisma enums, not free-text strings.

---

## AUTH (custom JWT: access + rotating refresh, httpOnly cookies)

- Auth is middleware, defined in `shared/middleware/` and wired per-route in `<feature>.routes.ts`. Never scatter auth checks inside controllers or services.
- The service layer receives an already-authenticated actor (a typed `AuthContext`), never a raw request or token. Token/session parsing stops at the middleware boundary.
- This placement holds regardless of provider — the provider changes the middleware implementation, not the structure.
- Authorization (can this actor do this?) belongs in the service, not the middleware. Middleware answers *who*; the service answers *whether*.
  - **The dividing line, since this is easy to get wrong:** `requireRole("admin")` is *coarse* gating — "is this actor even the kind of user this route is for" — answerable from the token alone, so it is middleware and returns **403**. "Is this *your* listing?" needs the record, so it is the service's job and must not be faked in middleware. Both exist; they answer different questions.
- 401 vs 403 is a real distinction, not a style choice: **401 means sign in, 403 means signing in again will not help.** The client renders them differently.
- Cookie flags live in exactly one module so login, refresh and logout cannot drift apart — a clear that doesn't match the set leaves the original cookie in place.
- Never log a raw token. The pino redaction list in `shared/logger.ts` covers `cookie`, `set-cookie` and `authorization`, and has a test asserting it.

---

## COMMENTS

- Comment only what the code cannot say for itself. If a comment restates the line below it, delete the comment rather than the line.
- No narration (`// increment the counter`), no obvious labels, no commented-out code left behind.
- Reach for a clearer name, a smaller function, or an extracted well-named variable *before* reaching for a comment. A comment is what you write when the code genuinely cannot carry the meaning.
- Do write one when the reason is not in the code: non-obvious logic, a complex algorithm, a design decision worth defending, a workaround (link the issue), an edge case, or an external constraint — a Prisma quirk, a driver limitation, a spec requirement.
- Explain **why**, not **what**. The code already says what.
- When you touch a file, delete or rewrite comments that have become redundant, obvious, or stale. A comment that no longer matches the code is worse than no comment.

---

## TESTING (Vitest + supertest)

- Colocate tests in the feature's `__tests__/` folder. Config in `vitest.config.ts` with `environment: 'node'`. Vitest handles TypeScript natively — there is no ts-jest/SWC step to configure.
- **Unit tests** cover services and pure logic. Mock the client module — `vi.mock('../../lib/prisma')` — so no DB is touched. Fast, isolated. This is the bulk of the tests. Note there is **no `@/` path alias** in `backend/tsconfig.json`; use relative specifiers.
- **Integration tests** cover routes → controller → service → real test DB. Import `app` from `app.ts` into supertest — never call `listen()` in tests.
- **Test database:** a dedicated PostgreSQL DB via a separate `DATABASE_URL` in `.env.test`. Never point tests at the dev or prod database. Run `prisma migrate deploy` against it before the suite.
- **Isolation:** reset state in `beforeEach` (truncate via `tests/helpers/db.ts`). Build test data through factories, not repeated inline literals.
- **Concurrency:** integration tests must not run in parallel — they share one database and would truncate each other's rows. `fileParallelism: false` is the default in `vitest.config.ts`; override with `--no-file-parallelism=false` when running only unit tests. An intermittently failing suite is worse than a slow one.
- **Cleanup:** disconnect Prisma in `afterAll`, or the run hangs on open handles. Don't paper over it with a forced exit.
- `restoreMocks: true` in config handles spy cleanup between tests; don't hand-roll `vi.resetAllMocks()` in every `beforeEach`.
- Follow Arrange → Act → Assert. One clear behavior per `it()`.

---

## DO NOT

- No business logic or Prisma calls in controllers/routes.
- No returning Prisma models directly to the client.
- No inconsistent response shapes — everything goes through `ApiResponse`.
- No per-handler try/catch that swallows or reshapes errors; let the global handler do it.
- No throwing raw strings or generic `Error`; use typed errors.
- No `any`, no unchecked casts.
- No non-null assertions (`!`) or `@ts-ignore` to silence the compiler.
- No returning `null` from services as a sentinel — throw a typed error, or return an explicit empty value with a typed shape.
- No `new PrismaClient()` outside `lib/prisma.ts`.
- No single-file schema — every model lives in a domain file under `prisma/schema/`, and `schema.prisma` keeps only `datasource` + `generator`.
- No unrelated models sharing a schema file, and no enum duplicated across files — shared enums go in `enums.prisma`.
- No `Float` for money; no free-text where an enum belongs.
- No cross-feature imports of another feature's internals; go through its service or a shared module.
- No scattered env/config reads; no secrets in code.
- No `console.log`; no logging secrets or full payloads.
- No skipping input validation "because it's internal."
- No comments that restate the code; no commented-out code; no stale comments left behind after an edit.
- No tests against the dev/prod database; no `listen()` inside tests; no `--forceExit` to hide open handles.
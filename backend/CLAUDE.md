# Backend CLAUDE.md

Scope: backend code only. Applies to every backend session for this stack.
Stack: Node.js + Express + Prisma + TypeScript.

---

## UNIVERSAL RULES

- Feature-based (package-by-feature), never layer-by-type at the top level. A feature owns its own routes/controller, service, data access, schemas/DTOs, and tests.
- Controllers/routes are thin: validate input → call service → shape response. No business logic, no DB access, no cross-feature calls.
- Business logic lives in services. Data access lives in repositories (or a single data layer). Keep these layers separated.
- One response envelope for ALL endpoints — success and error. Never return bare entities or ad-hoc shapes.
- Validate at the boundary (controller/route) before anything touches the service. Services trust their inputs.
- Never leak Prisma models to the client. Map to a response DTO/type.
- Centralized error handling. Handlers throw typed errors; a single global handler converts them to the envelope. No try/catch in every handler.
- Centralize config/env access in one module. No scattered `process.env` reads across features.
- Use a structured logger, never `console.log`. Never log secrets, tokens, or full request bodies.
- No secrets, keys, or connection strings in code. Fail fast on missing required config at startup.
- Every request and response has an explicit type/shape (see Validation & Typing).

---

## FOLDER LAYOUT (per feature)

```
src/
  features/
    <feature>/
      <feature>.routes.ts       # router + middleware wiring only
      <feature>.controller.ts   # req/res, validate, call service
      <feature>.service.ts      # business logic
      <feature>.repository.ts   # Prisma calls only
      <feature>.schema.ts       # Zod schemas (input + output)
      <feature>.types.ts        # inferred + domain types, DTOs
      __tests__/
        <feature>.service.test.ts     # unit
        <feature>.routes.test.ts      # integration
  shared/
    middleware/                 # errorHandler, auth, validate, etc.
    errors/                     # AppError + subclasses
    response/                   # ApiResponse helpers
    config/                     # env parsing (validated)
  lib/
    prisma.ts                   # single PrismaClient instance (see Prisma rules)
  app.ts                        # express app assembly (NO listen)
  server.ts                     # bootstrap + app.listen()
tests/
  setup.ts                      # global test setup
  helpers/
    db.ts                       # reset/truncate helpers
    factories.ts                # test data builders
```

`app.ts` and `server.ts` are separate on purpose: `app.ts` exports the configured Express instance (importable by tests via supertest), `server.ts` is the only place that calls `app.listen()`.

---

## RESPONSE ENVELOPE

```ts
type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: Record<string, unknown>;
};

// helpers
ok<T>(data): { success: true, data, error: null }
fail(code, message, details?): { success: false, data: null, error: {...} }
```

- Controllers return `res.status(n).json(ok(data))`. Errors are thrown, not returned.
- For list endpoints, `meta` carries pagination in a fixed shape: `{ page, pageSize, total }`. Do not invent per-endpoint pagination shapes.

---

## VALIDATION & TYPING (Zod at the boundary)

- Define `Body`, `Params`, `Query` schemas in `<feature>.schema.ts`.
- Validation runs in a shared `validate` middleware (in `shared/middleware/`), wired per-route in `<feature>.routes.ts` — NOT via `.parse()` inside controllers. The middleware parses the schema, replaces `req.body`/`req.params`/`req.query` with the parsed (typed) values, and passes control on. A `ZodError` bubbles to the global handler as a 422.
- Controllers therefore receive already-validated, correctly-typed input and never call `.parse()` themselves.
- Derive types with `z.infer<>` — do not hand-write a parallel type.

Route wiring pattern (order matters: auth → validate → controller):

```ts
// <feature>.routes.ts
router.post(
  "/",
  requireAuth,                          // auth middleware first
  validate({ body: createQuotationSchema }),  // then validation
  quotationController.create,           // thin controller last
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
- Confirm the Express major version before choosing. This project targets Express 5 unless stated otherwise.

---

## PRISMA

- **Single client instance.** Instantiate `PrismaClient` exactly once in `lib/prisma.ts` and import it everywhere. Never `new PrismaClient()` inside a feature — it exhausts the connection pool.
- **Repositories own all Prisma calls.** Services call repositories, not Prisma directly. A repository may be collapsed into the service only when it is a pure passthrough with zero query logic to hide — otherwise keep it separate.
- **`select` / `include` discipline.** Fetch only the fields you need with explicit `select`. Never return a raw row to the client; map to a DTO. This is the first line of defense for "never leak persistence models."
- **Transactions.** Any operation that performs multiple related writes (e.g. inquiry → quotation) runs inside `prisma.$transaction`. Never leave a multi-write flow partially committed.
- **Migrations.** Schema changes go through `prisma migrate`. Never hand-edit the database or rely on `db push` for anything that ships.

---

## AUTH

- Auth is middleware, defined in `shared/middleware/` and wired per-route in `<feature>.routes.ts`. Never scatter auth checks inside controllers or services.
- The service layer receives an already-authenticated actor (e.g. a typed `AuthContext`), never a raw request or token. Token parsing/verification stops at the middleware boundary.
- This placement holds regardless of provider (Clerk, custom JWT, etc.) — the provider changes the middleware implementation, not the structure.

---

## TESTING

- **Framework:** Vitest + supertest. Colocate tests in the feature's `__tests__/` folder.
- **Unit tests** cover services and pure logic. Mock Prisma (mock `lib/prisma.ts`). Fast, isolated, no DB. This is the bulk of the tests.
- **Integration tests** cover routes → controller → service → real test DB. Import `app` from `app.ts` into supertest — never call `listen()` in tests.
- **Test database:** a dedicated DB via a separate `DATABASE_URL` in `.env.test`. Never point tests at the dev or prod database. Run `prisma migrate deploy` against it before the suite.
- **Isolation:** reset state in `beforeEach` (truncate via `tests/helpers/db.ts`). Build test data through factories, not repeated inline literals.
- **Concurrency:** run integration tests serially (`--no-file-parallelism`) so they don't fight over the shared test DB. Unit tests may run in parallel.
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
- No cross-feature imports of another feature's internals; go through its service or a shared module.
- No scattered env/config reads; no secrets in code.
- No `console.log`; no logging secrets or full payloads.
- No skipping input validation "because it's internal."
- No tests against the dev/prod database; no `listen()` inside tests.
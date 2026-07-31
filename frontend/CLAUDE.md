# Frontend CLAUDE.md

Scope: frontend code only. Applies to every frontend session for this stack.
Stack: React + TypeScript + Next.js (App Router) + shadcn/ui + TanStack (Query + Form) + Zod.

---

## THIS IS NOT THE NEXT.JS YOU KNOW

Next.js 16 has breaking changes relative to training data — APIs, conventions,
and file structure may all differ. Read the relevant guide in
`node_modules/next/dist/docs/` before writing App Router code rather than
relying on remembered APIs. Heed deprecation notices.

Two that bite immediately: `params` and `searchParams` are Promises and must be
awaited, and Tailwind 4 is configured CSS-first through `@theme` in
`src/app/globals.css` — there is no `tailwind.config.js`. Custom utilities are
declared with `@utility`, not as bare classes in `@layer components`.

---

## ADOPTION STATUS

The rules below are the target. Three are deliberately not adopted yet, so that
a session doesn't "fix" working code into a half-migration:

| Rule | Status |
|---|---|
| `src/features/` slices, Zod, throwing API client, PascalCase | **Adopted** |
| shadcn/ui primitives | **Deferred** — `components/ui/` holds hand-built primitives on the same token system. Swap is a deliberate, separate task. |
| TanStack Query | **Deferred** — nothing on the public surface has server state. Adopt with the first authenticated screen. |
| TanStack Form | **Deferred** — pairs with the shadcn decision. Forms use Zod schemas with local state and a shared submit helper. |

Known deviation: `features/auth/components/VerifyEmailClient.tsx` verifies a
token from the URL inside `useEffect`, because the request must fire on mount
and there is no query client yet. It is the first thing to move when TanStack
Query lands.

---

## UNIVERSAL RULES

- Feature-based structure. A feature owns its components, hooks, api layer, schemas, and types. No global "components dump" for feature-specific code.
- Components are thin/presentational. Data fetching, mutations, and logic live in hooks — not inline in JSX.
- Server state and client state are separate concerns. Never store server data in `useState`/context.
- One typed API client. Every response conforms to the backend `ApiResponse<T>` envelope; unwrap it in one place.
- Validate at boundaries with Zod: form input and untrusted API responses. Derive types from schemas, never hand-write a parallel type.
- shadcn/ui primitives are generated + owned in `components/ui`. Customize via props/`className`/`cn()` and tokens — don't fork them casually.
- Default to Server Components. Add `"use client"` only when a file needs interactivity/hooks/browser APIs.
- No cross-feature deep imports. Import another feature only through its `index.ts` public surface.

---

## FOLDER STRUCTURE

Feature slices live outside the route tree. `src/app/` holds routes only.

```
src/
  app/                        # Next.js routes ONLY — thin, import from features
    (auth)/
      login/page.tsx          # composes <LoginForm /> from features/auth
    (shell)/
      browse/page.tsx
    page.tsx                  # composes the landing sections
  features/
    <feature>/
      components/             # feature-specific components
      hooks/                  # use<Feature>Query, use<Feature>Mutation, ui hooks
      api/                    # query/mutation fns + queryKeys
      schemas/                # Zod schemas (form + response)
      content.ts              # static copy/data owned by the feature
      types.ts                # inferred + domain types
      index.ts                # public exports (only what other code may import)
  components/
    ui/                       # shared primitives (shadcn/ui once adopted)
    <shared>/                 # genuinely cross-feature components only
  hooks/                      # shared cross-feature hooks
  providers/                  # context providers (see STATE MANAGEMENT)
  lib/
    api.ts                    # typed fetch client + envelope unwrap
    utils.ts                  # cn(), helpers
```

- `app/**/page.tsx` stays thin: compose feature components, no fetching logic beyond server-side calls that delegate to the feature api layer.
- Every feature has an `index.ts`. Importing `features/auth/components/LoginForm` from outside `features/auth/` is a violation — export it from `index.ts` and import `@/features/auth`.
- A component used by exactly one feature lives in that feature, never in `src/components/`.
- `src/components/` (outside `ui/`) is for components used by 2+ features. If it has one consumer, move it into that feature.

---

## STATE MANAGEMENT

- **Server state → TanStack Query.** All remote data via `useQuery`/`useMutation`. Never mirror it into `useState`/context.
- **Client state → local first.** `useState`/`useReducer` for component state. Lift only when shared.
- **Shared client UI state → React context**, and only when genuinely cross-cutting (theme, auth session, modal registry). One provider per concern, defined in `src/providers/`, exposed through a `use<Name>()` hook that throws when used outside its provider. Never a single god-context.
- No external client-state library (Zustand/Redux/Jotai). If a piece of state feels like it needs one, it is almost always server state that belongs in TanStack Query, or URL state.
- **URL state → searchParams** for filters, pagination, tabs, sort. Don't duplicate URL state in React state.
- Never fetch in `useEffect`. Use TanStack Query.

---

## API CONSUMPTION (matches backend envelope)

Backend always returns the shared `ApiResponse<T>` from `@homematch/shared`:

```ts
type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: Record<string, unknown>;
};
```

- `lib/api.ts` unwraps centrally: on `success === false` (or non-2xx), throw a typed `ApiError { code, message, details }` so TanStack Query's error path handles it.
- On success, return `data` typed as `T`. Validate critical responses with the feature's Zod schema before returning.
- Query/mutation functions live in `features/<feature>/api/`. Components call the feature hook, never `fetch` directly.
- `queryKeys` are colocated per feature as structured arrays: `['<feature>', 'list', params]`, `['<feature>', 'detail', id]`. Invalidate by key on mutation success.
- Error codes come from `ERROR_CODES` in `@homematch/shared`. Never inline a code string on either side of the wire.
- Auth uses JWTs in httpOnly cookies. The client sets `credentials: "include"` and never reads, stores, or attaches a token itself.

---

## FORMS (Zod today, TanStack Form once adopted)

- Schema in `features/<feature>/schemas/`; infer the form type with `z.infer<>`.
- The Zod schema is the only validation authority. No hand-written parallel checks in the submit handler, and no second copy of a rule the schema already states.
- Render field errors from the schema's flattened issues, keyed by field name; don't invent per-field error state that the schema could produce.
- On submit failure, move focus to the first invalid field — an error the user cannot see announced is an error they cannot fix.
- Reuse the backend's shared schema when one exists rather than duplicating validation rules.
- Form components are `"use client"`; keep the surrounding page a Server Component.
- Once TanStack Form is adopted: wire the schema via `validators: { onChange: schema }` and read errors from `field.state.meta.errors`.

---

## COMPONENT CONVENTIONS

- `PascalCase` for components and their files (`LeadCard.tsx`). Hooks `useCamelCase`. Non-component modules stay kebab-case (`cost-category.ts`). One primary component per file.
- Named exports for components/hooks. Default export only where Next requires it (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`).
- Colocate: a component used by one feature lives in that feature, not in global `components/`.
- Explicit prop types via `type`/`interface`. No implicit `any`. Skip `React.FC`; type props directly.
- Customize via `className` + `cn()`, variants, and composition/wrappers. Use Tailwind design tokens, not scattered arbitrary values (`w-[437px]`). Fluid type scales belong in `@theme` as `--text-*` tokens rather than repeated `text-[clamp(...)]`.
- `"use client"` sits at the top of the smallest component that needs it — not the whole tree.

---

## STRICT TYPESCRIPT

- `strict: true`, `noUncheckedIndexedAccess: true`. `any` is banned — use `unknown` + narrowing.
- Explicit return types on exported functions and all hooks.
- No non-null assertions (`!`) or `@ts-ignore`/`@ts-expect-error` to silence the compiler (allowed only with a justifying comment).
- Discriminated unions for variant props and async/request state — not boolean soup.
- Derive types from Zod (`z.infer`) and from API generics; don't maintain parallel hand-written types.
- `satisfies` for config/const objects to keep inference while enforcing shape.

---

## ACCESSIBILITY

Non-negotiable, and cheaper to keep than to retrofit:

- Every input has a visible `<label>`; errors are wired via `aria-invalid` + `aria-describedby`, not colour alone.
- Interactive elements keep a visible focus ring. Never remove the outline without replacing it.
- One `<h1>` per page, headings in order, landmarks (`header`/`nav`/`main`/`footer`) present.
- Icons are decorative by default (`aria-hidden`); an icon-only control needs an `sr-only` label.
- Respect `prefers-reduced-motion` on every animation.
- No dead links: an item is a real route, an on-page anchor, or a visibly disabled element.

---

## DO NOT

- No `fetch`/axios calls inside components; go through the feature api layer (and query/mutation hooks once adopted).
- No server data in `useState`/context — that's TanStack Query's job.
- No adding a client-state library; context is the ceiling here.
- No data fetching in `useEffect`.
- No business/data logic in JSX; extract to hooks.
- No `any`, no `@ts-ignore`, no `!` to satisfy the compiler.
- No hand-written types that duplicate a Zod schema or the API envelope.
- No editing shared primitives destructively or scattering arbitrary Tailwind values instead of tokens/variants.
- No `"use client"` at the top of everything by default.
- No cross-feature deep imports — go through the feature's `index.ts`.
- No feature code inside `src/app/`; routes compose, they don't implement.
- No swallowed/ignored errors; surface them via the envelope's error path.
- No manual form validation branches when a Zod schema exists.
- No prop drilling more than ~2 levels; colocate or use context.
- No invented social proof — user counts, ratings, and testimonials must be real or absent.

---
title: HomeMatch AI — Build Checklist
tags:
  - homematch
  - project/status
status: in-progress
stage: 2
updated: 2026-08-03
---

# HomeMatch AI — Build Checklist

Status of every stage in [[HomeMatch_AI_Build_Roadmap]], checked against the code rather than
against memory.

> **How to read this.** A ticked box was verified in the repository on the date above — a route
> file, an endpoint, a model, or a passing test. Everything else is not built, however close it
> feels. Feature and page names are quoted from the roadmap so the two documents stay diffable.
>
> *(The wikilink above resolves in Obsidian, not on GitHub. `context/` is gitignored, so there
> is no repo-relative path to point at.)*

---

## Where things stand

| Stage | Focus | Status | What's blocking it |
|---|---|---|---|
| 0 | Foundation & walking skeleton | **Partial** | No Dockerfile, nothing deployed, no README |
| 1 | Auth, RBAC & user profiles | **Partial** | Nothing deployed |
| 2 | Listings core + media uploads | **Partial** | No seed catalog, no CDN, nothing deployed |
| 3 | Discovery: search, filter, favorites | **Started** | `/browse` and the listing card exist; no filters, sort, favorites or cache |
| 4 | AI layer: true cost, match score, comparison | **Started** | True cost done; score and comparison not begun |
| 5 | Landlord dashboard + analytics + audit | **Not started** | — |
| 6 | AI assistant + hardening | **Started** | Rate limiting and tests done; assistant not begun |
| 7 | Portfolio packaging | **Not started** | — |

**Nothing is deployed.** Every stage's definition of done ends in "✅ Deployed", so no stage is
formally complete regardless of how much of its code exists.

---

## Stage 0 — Foundation & Walking Skeleton

### Features
- [x] Health-check endpoint — `GET /api/health`
- [x] CI green badge — `.github/workflows/ci.yml`, lint → typecheck → test → build
- [x] Environment config + secrets — fail-fast Zod parsing in `backend/src/shared/config/env.ts`

### What gets built
- [x] Repo structure — npm-workspaces monorepo (`backend`, `frontend`, `packages/shared`)
- [x] Next.js app + Express API, talking to each other
- [x] PostgreSQL running locally via Docker
- [x] `docker-compose` for local dev — Postgres, Adminer, MinIO
- [ ] Dockerfiles for both services
- [ ] First deploy to AWS
- [x] `.env` handling — `.env.example` on both sides; Secrets Manager strategy still undecided

### Pages
- [x] `/` — landing page (built well past a "coming soon" shell)
- [x] Health indicator — `GET /api/health`

### Definition of done
- [ ] Live URL
- [x] CI green
- [ ] Frontend successfully calls deployed API
- [ ] Repo README started — **no README exists at the repo root**

---

## Stage 1 — Auth, RBAC & User Profiles

### Features
- [x] Signup / login / logout
- [x] Role-based route protection (frontend + API)
- [x] Editable renter preference profile — model, migration, `/api/profile`, and the page;
      saves, reloads, and validates on blur
- [x] Password hashing, input validation — argon2id, Zod at every boundary

### Pages
- [x] `/signup`, `/login`
- [x] `/profile` — renter preferences form; `/onboarding` redirects here
- [x] `/dashboard` router that sends each role to the right home
- [x] `/admin` shell (protected) — `/admin`, `/admin/users`, `/admin/listings`, gated in its layout
- [x] Landlord area shell (protected) — `/landlord`, gated in its layout

### Definition of done
- [x] Three roles work — `renter`, `landlord`, `admin`
- [x] RBAC enforced on both sides — `requireRole` middleware plus server-component guards
- [x] Renter profile saves and reloads — `RenterPreference` model, `/api/profile` GET + PATCH,
      asserted end to end in `profile.routes.test.ts`
- [ ] Deployed

> **The preference fields now exist, and they are deliberately narrower than this roadmap
> section describes.** `RenterPreference` carries four things: `budget`, `householdSize`, a
> flat `wants` enum (pets, parking, own bathroom, furnished, near transit, aircon), and
> `otherNeeds` free text. Every want maps 1:1 to a `Listing` column, which is what keeps the
> list at six — a want with nothing to compare against cannot be scored. See the divergence
> notes below.
>
> **The page is built too.** `/profile` renders the four fields with per-field validation on
> blur and one page-level save; `/onboarding` redirects to it, and `homeFor("renter")` now
> sends renters there after login instead of to the `/dashboard` shell. Design, copy, and the
> build's divergences from it are recorded in `docs/design/profile-surface.md`.
>
> One consequence worth tracking: **`/dashboard` is now unreachable for renters** by normal
> navigation, so its `ComingSoon` shell is only seen by someone typing the URL. It needs to
> become a real screen or be removed. The same is now true for landlords and admins, since
> `homeFor` answers for every role.
>
> **`/admin` is built.** Three pages behind `requireRole("admin")` — an overview, a users table
> with row actions, and an all-owners listings table. `/api/admin` is its backend. The overview
> deliberately reports counts over rows and no traffic at all; see the divergence note below
> for why, and `docs/design/admin-surface.md` for the surface.

---

## Stage 2 — Listings Core + Media Uploads

### Features
- [x] Listing create/edit form with image upload
- [x] Listing detail rendering (photos, all fields, cost fields) — `/listings/[slug]`, signed-in only
- [x] Ownership scoping — enforced in the service; another landlord's listing returns 404
- [ ] Admin bulk/quick-add for seeding

### Pages
- [x] `/landlord/listings/new`, `/landlord/listings/:id/edit`
- [x] `/listings/:id` — detail page, built as `/listings/[slug]` and **behind auth** (see divergences)
- [x] `/landlord` — manage my listings
- [x] `/admin/listings` — manage all; **seeding is not built**, so the "seed" half of this row
      is still open and tracked by the unticked quick-add above

### Definition of done
- [x] Create a listing with photos → visible on a detail page
- [ ] S3 + CDN working — presigned upload works against MinIO and the anonymous-read policy
      is now set by `minio-init` in `docker-compose.yml`, so photos load. **There is still no
      CDN**, and in production the bucket should stay private behind one
- [x] Enrichment fields in the schema — as structured columns, with the divergences below
- [ ] 10+ seed listings loaded — the database holds 6 rows created for testing, not a curated
      catalog
- [ ] Deployed

---

## Stage 3 — Discovery: Search, Filter, Favorites, Browse

> The first feature below is in progress and has its own checklist:
> [[ONBOARDING-AND-FILTERS-CHECKLIST]] (`docs/ONBOARDING-AND-FILTERS-CHECKLIST.md`).
> It also covers the renter onboarding gate and the location preference the
> filters open with, neither of which the roadmap lists under this stage.

### Features
- [ ] Multi-filter search with pagination + sort
- [ ] Redis-cached queries (with cache invalidation on listing update)
- [ ] Favorites list
- [ ] Browse/discovery interaction (buttons/keyboard/swipe)

### Pages
- [x] `/browse` — real catalog: server-rendered grid, paging, no filters yet, **behind auth** (see divergences)
- [ ] `/discover`
- [ ] `/favorites`
- [x] Reusable listing-card component — `features/catalog/components/ListingCard`

---

## Stage 4 — AI Layer: True Cost + Match Score + Comparison

### Features
- [x] True monthly cost calculator + breakdown UI — deterministic, itemized, shared by both
      sides so the API gate and the UI cannot disagree
- [ ] Rules-based scoring engine
- [ ] LLM explanation layer
- [ ] Two-way AI comparison

### Pages
- [ ] Match score + "why" component on `/listings/:id` and on cards
- [x] Cost breakdown component/panel — `CostBreakdown`, on the editor and the units dashboard
- [ ] `/compare`

> The calculator landed early because Stage 2's editor needed a number to show. The score and
> comparison both depend on the renter profile from Stage 1, which does not exist yet.

---

## Stage 5 — Landlord Dashboard + Analytics + Audit

### Features
- [ ] View/save/interest tracking
- [ ] Background aggregation job
- [ ] Landlord analytics charts
- [ ] Audit log + admin viewer

### Pages
- [ ] `/landlord/dashboard` — metrics and per-listing charts
- [ ] `/admin/audit`

> `/landlord` today is inventory management, not analytics. It deliberately shows no views,
> saves, or interest counts: nothing tracks them, and inventing traction on a product whose
> claim is that its numbers can be checked would be the worst place to start.

---

## Stage 6 — AI Assistant + Intelligence + Production Hardening

### Features
- [ ] NL assistant (intent → real query → explained answer)
- [ ] Commute + neighborhood panels
- [ ] Test suite + monitoring + security hardening — **partial**, see below

### Hardening, itemized
- [x] Meaningful test suite — 108 backend tests, unit and integration, green in CI
- [x] Rate limiting — per-route limiters; login, register, token, password reset, geocoding
- [x] Input sanitization pass — Zod at every route boundary, no ad-hoc parsing in controllers
- [ ] CloudWatch logs + basic alarms
- [ ] Error monitoring

### Pages
- [ ] `/assistant`
- [ ] Commute + neighborhood sections on `/listings/:id`

---

## Stage 7 — Portfolio Packaging

- [ ] README that sells
- [ ] Architecture doc
- [ ] Tier 3 design docs
- [ ] Demo mode / seed reset script
- [ ] 2–3 min demo video

---

## Built beyond the roadmap

Real work no stage asked for, which would otherwise be invisible above.

- [x] **Email verification** — tokenised, with resend, backed by Resend
- [x] **Password reset** — request and confirm, separate token type
- [x] **Refresh-token rotation with reuse detection** — token families, SHA-256 at rest, a grace
      window for races
- [x] **Geocoding** — its own backend slice; address → coordinates through Mapbox, server-side so
      the billed token never reaches a browser, results bounded to Metro Manila
- [x] **Publish readiness gating** — the API refuses to publish a listing renters cannot decide
      on, and returns the exact blocking fields so the UI can point at them
- [x] **Landlord units dashboard** — one ranked list with a next-action card, replacing a
      four-column status board
- [x] **Map location picker** — draggable pin, precision recorded honestly per source

---

## Deliberate divergences from the roadmap

Changes made on purpose. Recorded so nobody "fixes" them back.

### shadcn/ui was adopted, but only for `/admin`

`frontend/CLAUDE.md` had shadcn listed as **Deferred**, with hand-built primitives in
`components/ui/` on the token system. It is now **adopted and scoped**: generated components live
in `components/shadcn/` and are imported only by `features/admin` and `app/admin`. Everything
else still uses `components/ui/`.

*Why:* `/admin` needed a table, tabs, pagination, a dropdown menu, a generic dialog and a
sidebar — six primitives that did not exist — and the requested look was explicitly the shadcn
dashboard. Building all six by hand to imitate shadcn is the expensive way to arrive at shadcn.

*Why a separate directory, which matters more than it looks:* **NTFS is case-insensitive.**
`components/ui/` already holds `Button.tsx`, `Badge.tsx`, `Card.tsx` and `Dialog.tsx`; the CLI
generates `button.tsx`, `badge.tsx`, `card.tsx` and `dialog.tsx`. On Windows those are the same
four paths, so a default install would have silently overwritten four components the landing,
auth, landlord and profile screens all import. The directory split makes the collision
impossible and states the scope in every import path.

Two supporting decisions: shadcn's semantic CSS variables are **aliased onto the existing
`--color-*` tokens** in `globals.css` rather than given their own slate palette, so colour stays
defined once and a regenerated component inherits the product's palette unedited. And
`@custom-variant dark` is kept deliberately — it rebinds `dark:` to a `.dark` ancestor that
nothing sets, which makes the dark styles baked into generated components inert instead of
firing on a visitor whose OS is in dark mode.

The generated files are ESLint-ignored, because `shadcn add` overwrites them and a hand-fix
would not survive. Our code that *uses* them is linted normally.

### `/admin` got real design effort, which `PRODUCT.md` says it should not

`PRODUCT.md:20` says admin tooling "stays utility-grade and should not consume design effort
that belongs to the other two". `/admin` has a sidebar shell, a validated chart, faceted
filters and a designed empty/loading state.

*Why:* it was asked for directly, and the shadcn adoption means most of that effort was
installation rather than design. Recorded because it is a real divergence and the next session
should not read the polish here as licence to spend the same effort on the next admin screen.

### The admin overview reports rows, not traffic

Stage 5 specifies analytics — views, saves, interest, conversion. The overview page shows none
of them: account and listing counts, verification share, readiness blocks, published-rent
range, and two 30-day series built from `createdAt`.

*Why:* there is no event tracking, no aggregation job and no audit log, so none of those
numbers have a source. `/landlord` already set this precedent for the same reason (see the
Stage 5 note above), and inventing traction on a product whose claim is that its numbers can be
checked is the worst possible place to start. Stage 5 stays unticked; when the event substrate
lands, this page gains the figures honestly.

One consequence: `publishedRent` is `null` rather than `0` when nothing is published, and the
card says so in words. A zero would read as "the average rent is ₱0".

### Enrichment fields were cut back
`nearestTransit`, `floodRiskNote`, `estUtilities`, `estInternet`, `assocDues`, `floorArea`,
`furnished` and `availableFrom` were dropped from the schema. Dues, utilities and internet
collapsed into a single **`otherFees`** field.

*Why:* the editor asked for more than a landlord will realistically fill in, and three separate
numbers to reach one figure they think of as one number cost more than the itemisation was
worth. Stage 2's schema block still lists all of them.

**Amended:** `furnished` and transit are back, as booleans, along with a new `aircon` —
migration `20260803223144_align_listing_amenities_with_wants`. The original cut stands on its
own reasoning, but that reasoning was "nothing consumes these and they cost the landlord
effort". The renter profile's `wants` is now a consumer that did not exist then, and a want with
no listing field to compare against cannot be scored. A checkbox is also a fraction of the cost
of the free-text `nearestTransit` that was removed — the station name lives in `description`
instead. `floodRiskNote`, `estUtilities`, `estInternet`, `assocDues`, `floorArea` and
`availableFrom` remain cut.

### The renter profile ships four fields, not nine
Stage 1 lists "budget, work/school location, transport mode, pets, parking, household size,
accessibility, move-in date, lifestyle prefs". `RenterPreference` carries **`budget`,
`householdSize`, a flat `wants` enum, and `otherNeeds` free text**. Move-in date, move-in
flexibility, deposit budget, the geocoded commute anchor, transport mode, and the commute
ceiling were all built and then removed the same day.

*Why:* HomeMatch is inquiry-led, not booking-led. Asking for a move-in date and a deposit
figure before the renter has seen a single unit asks them to commit to specifics they do not
have, and every one of those fields was a row they would leave blank. The two-tier checkbox
split (disqualifying `requirements` vs weighted `priorities`) collapsed into one list for a
related reason: which wants are genuinely non-negotiable varies per renter and per search, and
a later extraction step can read that out of `otherNeeds` better than a renter can declare it
up front. Location wants — "near UP Diliman" — now live in the renter's own words.

`otherNeeds` is **scored input, not a note.** A future LLM step converts its prose into
structured `wants`; the deterministic engine still does the scoring, so the hybrid rule holds.

### Move-in cost left the True Monthly Cost
Stage 4 specifies "amortized moving cost" as part of the figure. It is no longer included.

*Why:* amortising deposit + advance over twelve months made a ₱5,000 unit report ₱6,450 "per
month" — a number the landlord never typed, under a label that gave no hint it was derived. A
one-time payment does not belong in a monthly number however it is spread. The move-in total is
still shown, as its own figure. **PRODUCT.md was updated to match; the roadmap was not.**

### `commuteAnchors` was never built as a landlord input
It is not in the schema. The `ListingCommute` model exists and ships empty.

*Why:* asking a landlord to enter travel time to every anchor in Metro Manila is unusable. The
replacement is geocoded coordinates plus AI extraction of renter preferences ("near PUP and
SM"), computed rather than typed.

### Landlord routes are namespaced
`/landlord/listings/new` and `/landlord/listings/:id/edit`, not the roadmap's `/listings/new`.

*Why:* `/listings/:id` is reserved for the public detail page, and mixing a landlord's editor
into the same namespace invites a route collision.

### The catalog requires an account
`/browse`, `/listings/[slug]` and `/api/catalog` are all behind authentication.

*Why:* a product decision, taken deliberately against the roadmap. `PRODUCT.md:114` lists
`/browse` inside "the authenticated shell", but the roadmap's Stage 2 PRD says *"As anyone, I
can view a published listing's detail page"* (`:137`) and calls `/listings/:id` a "public
detail page" (`:149`). **The two source documents disagree and the roadmap was not updated.**

The gate is authentication, not role — renter, landlord and admin all see the same rows.

Knock-on effects, all deliberate: the catalog is out of `sitemap.xml`, disallowed in
`robots.txt`, and `noindex` on both pages, because a crawler following those URLs is
redirected and would index the login form under a listing's name. Pasted listing links no
longer unfurl a preview for the same reason.

### The detail page keys on slug, not id
`/listings/[slug]`, not the roadmap's `/listings/:id`.

*Why:* `slug` is already unique and already minted for every listing, and a public URL that
reads `/listings/kamias-corner-studio` is worth more to a catalog meant to be indexed and
shared than one carrying a UUID. The id is still the key everywhere behind the API.

### The public catalog is its own router, mounted at `/api/catalog`
Not additional routes on `/api/listings`.

*Why:* `listings.routes.ts:16` gates that whole router to landlords and admins with a single
`router.use`. Public routes added there would be public only while they stayed above that
line, which makes the feature's security depend on where the next route gets pasted. A
separate router at a separate mount cannot be gated or ungated by accident.

### `/browse` shipped without filters or search
The catalog pages; it does not filter, sort, or search. Stage 3's filter rows stay unticked.

*Why:* a deliberate call at four published listings, where every facet returns either
everything or nothing. The filter API is Stage 3 work and lands when the catalog is large
enough to exercise it.

### `walkabilityNote` is a column no form writes
Still in the schema and in `updateListingSchema`, but no UI sets it. Left deliberately rather
than dropped with the others — flagged here so it stays a decision rather than an oversight.

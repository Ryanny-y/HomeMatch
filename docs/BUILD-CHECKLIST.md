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
| 1 | Auth, RBAC & user profiles | **Partial** | No renter profile model, no `/admin` |
| 2 | Listings core + media uploads | **Partial** | No public detail page, no seed catalog, photos 403 |
| 3 | Discovery: search, filter, favorites | **Not started** | — |
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
- [ ] Editable renter preference profile — **backend built, UI not**: model, migration and
      `/api/profile` ship; the page is specced in `docs/design/profile-surface.md`
- [x] Password hashing, input validation — argon2id, Zod at every boundary

### Pages
- [x] `/signup`, `/login`
- [ ] `/profile` — renter preferences form — spec and API exist; **no route yet**
- [x] `/dashboard` router that sends each role to the right home
- [ ] `/admin` shell (protected) — **no `/admin` route exists**
- [x] Landlord area shell (protected) — `/landlord`, gated in its layout

### Definition of done
- [x] Three roles work — `renter`, `landlord`, `admin`
- [x] RBAC enforced on both sides — `requireRole` middleware plus server-component guards
- [x] Renter profile saves and reloads — `RenterPreference` model, `/api/profile` GET + PATCH,
      asserted end to end in `profile.routes.test.ts`
- [ ] Deployed

> **The preference fields now exist, and they are deliberately narrower than this roadmap
> section describes.** `RenterPreference` carries four things: `budget`, `householdSize`, a
> flat `wants` enum (pets, parking, step-free, own bathroom, furnished, near transit, quiet
> street, aircon, laundry), and `otherNeeds` free text. See the divergence note below.
>
> **What is still missing is the UI.** There is no `/profile` route; the page, its three
> components, and the retirement of `/onboarding` are specced in
> `docs/design/profile-surface.md` and not built. Until that lands a renter has no way to
> reach these fields, so the feature row above stays unticked.

---

## Stage 2 — Listings Core + Media Uploads

### Features
- [x] Listing create/edit form with image upload
- [ ] Listing detail rendering (photos, all fields, cost fields) — no public page renders one
- [x] Ownership scoping — enforced in the service; another landlord's listing returns 404
- [ ] Admin bulk/quick-add for seeding

### Pages
- [x] `/landlord/listings/new`, `/landlord/listings/:id/edit`
- [ ] `/listings/:id` — public detail page
- [x] `/landlord` — manage my listings
- [ ] `/admin/listings` — seed + manage all

### Definition of done
- [ ] Create a listing with photos → visible on a detail page — creation and upload work; there
      is no detail page
- [ ] S3 + CDN working — presigned upload works against MinIO, but the bucket has no
      public-read policy so **every photo URL returns 403**, and there is no CDN
- [x] Enrichment fields in the schema — as structured columns, with the divergences below
- [ ] 10+ seed listings loaded — the database holds 6 rows created for testing, not a curated
      catalog
- [ ] Deployed

---

## Stage 3 — Discovery: Search, Filter, Favorites, Browse

### Features
- [ ] Multi-filter search with pagination + sort
- [ ] Redis-cached queries (with cache invalidation on listing update)
- [ ] Favorites list
- [ ] Browse/discovery interaction (buttons/keyboard/swipe)

### Pages
- [ ] `/browse` — exists as a `ComingSoon` placeholder only
- [ ] `/discover`
- [ ] `/favorites`
- [ ] Reusable listing-card component

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

### Enrichment fields were cut back
`nearestTransit`, `floodRiskNote`, `estUtilities`, `estInternet`, `assocDues`, `floorArea`,
`furnished` and `availableFrom` were dropped from the schema. Dues, utilities and internet
collapsed into a single **`otherFees`** field.

*Why:* the editor asked for more than a landlord will realistically fill in, and three separate
numbers to reach one figure they think of as one number cost more than the itemisation was
worth. Stage 2's schema block still lists all of them.

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

### `walkabilityNote` is a column no form writes
Still in the schema and in `updateListingSchema`, but no UI sets it. Left deliberately rather
than dropped with the others — flagged here so it stays a decision rather than an oversight.

---
title: HomeMatch AI — Renter Onboarding & Catalog Filters
tags:
  - homematch
  - project/status
status: not-started
stage: 3
updated: 2026-08-06
---

# Renter Onboarding & Catalog Filters

Feature-level checklist for one unit of work, split across four phases.
[[BUILD-CHECKLIST]] stays the repo-wide stage tracker; this file is where the
day-to-day boxes live, and its Stage 3 rows are the ones that get ticked there
when Phase 4 lands.

> **How to read this.** Same rule as the build checklist: a ticked box was
> verified in the repository, not remembered. Boxes are ticked **in the PR that
> makes them true**, never in a batch at the end — a checklist updated
> retroactively is a checklist nobody can trust.

---

## Why this exists

Two problems, and the second is what unblocks Stage 3's first feature.

**A verified renter's first session goes nowhere useful.** `homeFor("renter")`
sends them to `/profile`, which is an *edit* surface. It works, but it waits
rather than asks, and the renter is meant to leave that first session with a
profile worth scoring against.

**`RenterPreference` has no location.** It carries `budget`, `householdSize`,
`wants` and `otherNeeds`. Nothing on it can seed a location filter, so
"multi-filter search" has no default to open with and the catalog opens the same
way for everyone.

---

## Decisions

| Decision | Reason |
|---|---|
| `/onboarding` is a **first-run gate reusing the profile's field components** — not a wizard, not a second form | One set of inputs and one schema. A separate stepper would be two surfaces over the same fields, to keep in sync forever |
| Location is `preferredCity String?` + **`preferredBarangays String[]`** | A renter realistically accepts several areas. One barangay makes the default filter too narrow to survive first contact — they would just clear it |
| The saved location reaches `/browse` as a **visible prefill in the URL** | `/browse` → `/browse?barangay=…`, rendered as removable chips. A filter the reader did not set must be visible and one click from gone |
| Onboarding is **skippable** | `EMPTY_RENTER_PREFERENCE` exists because a partial profile is a first-class state. A hard gate contradicts a rule the codebase already keeps |
| Barangay options are **derived from published listings**, not a static list of QC's 142 barangays | It cannot offer a filter that returns nothing, and `Listing.barangay` is free text — so the stored values are the only reliable source of their own spelling |

---

## Open decisions — these block their phase

- [x] **Phase 1 migration approved** — `preferredCity`, `preferredBarangays`,
      `onboardedAt` on `RenterPreference`. Applied as
      `20260806144748_add_renter_location_preference`, additive only
- [ ] **`trueMonthlyCost` on `Listing` — recommended, not yet agreed.** Blocks
      the budget filter in Phase 3; see [Divergences](#divergences) for the
      argument. Without it the budget filter runs against `rent` and must be
      *labelled* "rent" in the UI

---

## Phase 1 — Location on the renter profile

Branch `feat/renter-location-preference`. Ships alone: `/profile` gains a
location card, nothing else changes.

### Schema
- [x] `preferredCity String?` on `RenterPreference`
- [x] `preferredBarangays String[]` — native Postgres array, as `wants` already is
- [x] `onboardedAt DateTime?` — batched here so Phase 2 needs no migration of its
      own. Without it, "have they been through onboarding?" is indistinguishable
      from "have they set anything?", and a renter who deliberately skipped gets
      sent back every login
- [x] Migration `add_renter_location_preference`
- [x] Confirm `RenterPreferenceWrite` picks the columns up with no repository
      change — it is derived from `Prisma.RenterPreferenceUncheckedCreateInput`.
      Confirmed: `profile.repository.ts` is untouched by this phase

### Contract
- [x] `updateRenterPreferenceSchema` accepts both fields, with sanity caps in the
      spirit of `MAX_BUDGET` — bounds that catch a fat finger, not policy
      (`MAX_PREFERRED_BARANGAYS`, `MAX_PLACE_NAME_LENGTH`)
- [x] `RenterPreferenceDto` + `EMPTY_RENTER_PREFERENCE` carry both fields and
      `onboardedAt`
- [x] `canScoreListings` left alone — location is a filter, not a ranking input,
      which is the same line that docstring already draws for `budget`

### Frontend
- [x] `useProfileDraft` handles both fields in the draft, dirty count and
      `prepare()` diffing
- [x] `LocationCard` rendered by `ProfileScreen`
- [x] Free-text entry with chips for now; the derived picker arrives in Phase 3
      and needs no data migration, since it stores the same strings

### Done when
- [x] `npm run typecheck` · `npm test -w backend` (199 passed) ·
      `npm run lint -w frontend` (0 errors) · `npm run build -w frontend`
- [x] A city and two barangays save on `/profile`, survive a reload, and produce
      the right SaveBar dirty count (2 — city and areas, counted as two fields)

### Landed beyond the plan
- [x] **Enter adds an area instead of submitting the form.** `TextField` takes no
      key handler, so the key is caught on a wrapping element. Without it the
      obvious keystroke would have saved the page
- [x] **Areas dedupe case-insensitively**, first spelling kept — "diliman" and
      "Diliman" are one area to the person typing. Also deduped server-side,
      since a duplicate is not a mistake the renter can see and a 422 would be
      unanswerable
- [x] `focusFirstInvalid` now walks `FIELD_ORDER` rather than a hand-listed
      array that had already fallen behind

---

## Phase 2 — The first-run gate

Branch `feat/renter-onboarding-gate`. Depends on Phase 1's `onboardedAt`. No
schema change, no new feature slice.

### Routing
- [ ] `homeFor("renter")` returns `/onboarding`
- [ ] `/onboarding` decides server-side: `onboardedAt` set → `/browse`; otherwise
      render; wrong role → `homeFor(role)`, as `/profile` already does
- [ ] The decision lives on the page, not in `LoginForm` — one server hop for a
      returning renter, and it also covers a bookmark, a direct URL and a
      refresh-token session resume, none of which touch the login form
- [ ] `safeNext` untouched: an explicit `?next=` still wins, so a renter bounced
      off `/browse?page=3` still lands there

### Screen
- [ ] `OnboardingScreen` in `features/profile/components/`, exported from that
      feature's `index.ts` — it renders the profile's fields, so it belongs to
      the profile feature. The route only composes it
- [ ] Reuses `RubricRow`, `WantsGrid`, `LocationCard`, `useProfileDraft`,
      `useSaveProfile`. **No new inputs, no second schema**
- [ ] Ordered location → budget → wants; location leads because it is the field
      the very next screen consumes
- [ ] **Save and browse** and **Skip for now**, both stamping `onboardedAt`
- [ ] Stays in `(shell)` — the header and `UnsavedChangesProvider` still apply. A
      first-run screen with no way out is a trap; focus comes from a single
      centred column, not from removing the header

### Docs
- [ ] `docs/design/profile-surface.md` — `/onboarding` is no longer "Retired"
      (§47, §303, §599)
- [ ] `docs/BUILD-CHECKLIST.md:82`, `:102` — same

### Done when
- [ ] Fresh renter → login lands on `/onboarding`
- [ ] Save → `/browse`, and the next login goes straight to `/browse`
- [ ] Skip → `/browse`, and stays skipped on the next login
- [ ] Landlord and admin logins unaffected

---

## Phase 3 — Filter + sort API

Branch `feat/catalog-filter-api`. Depends on Phase 1 for barangay values to
filter on.

### Query contract
- [ ] `browseQuerySchema` extended — `barangay` (repeatable), `minCost`/`maxCost`,
      `bedrooms`, `propertyType`, `listingType`, `petsAllowed`,
      `parkingAvailable`, `furnished`, `q`, `sort`
- [ ] Reuses `propertyTypeSchema` / `listingTypeSchema` rather than restating the
      values
- [ ] Filters combine with **AND**; repeated `barangay` is an `IN`
- [ ] The `safeParse`-with-fallback in `browse/page.tsx` still holds — a bad
      filter value is a 422 for the API and a fallback for the page

### Repository
- [ ] One `Prisma.ListingWhereInput` built from the filter object, with
      `PUBLISHED` still spread into every `where` — that invariant is why drafts
      cannot leak and must not be refactored around
- [ ] `orderBy` tie-broken by `id` on **every** sort, for the stable-pagination
      reason the current comment gives
- [ ] `q` uses `contains` + `mode: "insensitive"`, with a comment recording that
      a leading wildcard cannot use an index — a known ceiling, not a surprise

### Facets
- [ ] `GET /api/catalog/facets` behind the same `requireAuth` + `catalogLimiter`
- [ ] Returns distinct barangays that actually have published listings, with
      counts
- [ ] Retrofitted into the Phase 1 barangay field on `/profile` and `/onboarding`

### Tests
- [ ] Each filter alone
- [ ] Two filters combining as AND
- [ ] Both sorts stable across page boundaries
- [ ] A filter matching nothing returns `200` with `[]` and `total: 0` — never 404
- [ ] Facets exclude draft and archived listings

---

## Phase 4 — Filter UI on `/browse`

Branch `feat/catalog-filter-ui`. Depends on Phase 3.

- [ ] Bare `/browse` with **no** filter params redirects to the renter's saved
      barangays. Only on a bare URL, so it can never fight a filter just cleared
- [ ] `FilterBar` — URL state via `searchParams`, so back/forward and a pasted
      link all behave. Every change resets to `page=1`
- [ ] `ActiveFilters` — removable chips and "Clear all", saying *"showing your
      saved areas"* when the chips came from the profile
- [ ] A third empty state. `BrowseScreen` distinguishes `EmptyCatalog` from
      `PastTheEnd`; filtered-to-nothing is neither, and must offer to widen
      rather than claim nothing is published
- [ ] The comment *"there are no filters on this page, so an empty catalog can
      only mean nothing is published yet"* becomes false in this phase — rewrite
      it rather than leave it
- [ ] `Pager` carries the filters through, not just `page`
- [ ] `fetchPublishedListings` forwards the whole filter object; it currently
      picks out only `page`/`pageSize`

### Done when
- [ ] At 1440 / 768 / 390: filter, combine two, page through with filters held,
      clear one chip, clear all
- [ ] Back/forward restores each filter set
- [ ] A filter matching nothing shows the widen-your-search state

---

## Divergences

Changes that contradict something already written down. Recorded in prose rather
than quietly overwritten, following the pattern in [[BUILD-CHECKLIST]].

### `/onboarding` is no longer retired

`docs/design/profile-surface.md:47` records it as **Retired** — *"`/profile` is
the only surface. Its empty state does first-run duty; no wizard, no separate
stepper."* This work brings the route back as a real page.

*Why the original decision was right, and why it still mostly holds:* the cost it
was avoiding was **two surfaces over one set of fields**, drifting apart. That
cost is real and is not being paid here — `/onboarding` renders the same
components, the same `useProfileDraft`, and the same schema as `/profile`. What
it adds is sequence and first-run copy, which an edit surface genuinely cannot
provide: a page that waits is not a page that asks.

The half of the original decision that stands: **no wizard, no stepper.** One
screen, one save, skippable.

### Structured location arrives alongside the free-text needs, not instead of it

`BUILD-CHECKLIST.md:334` records that location wants *"now live in the renter's
own words"*, as part of cutting the renter profile from nine fields to four.

*Why that is not being reversed:* the reasoning there was about **prose** — "near
UP Diliman" is richer than any dropdown and a later extraction step reads it
better than a renter can declare it up front. All true, and `otherNeeds` keeps
that job unchanged. But prose cannot drive a SQL `WHERE`, and Stage 3 is
specifically about filtering. `preferredBarangays` is the filter input;
`otherNeeds` stays the scoring input. Two fields, two jobs, neither replacing the
other.

The four-field profile becomes six. That is a real growth in what a renter is
asked for, and the mitigation is that onboarding is skippable and every field
stays optional.

### The budget filter needs a column that does not exist yet

Not yet agreed — see [Open decisions](#open-decisions--these-block-their-phase).

Every card on `/browse` leads with **true monthly cost**, not rent. That is the
product's central claim, stated in `ListingCard`'s own docstring. A budget filter
that quietly runs against `rent` breaks it in the most visible place available: a
renter setting ₱25,000 gets a grid of cards reading ₱25,500.

`rent + coalesce(otherFees,0) + coalesce(parkingCost,0)` cannot be expressed in a
Prisma `where`, and as raw SQL it cannot use an index.

*The recommendation:* `trueMonthlyCost Decimal @db.Decimal(12,2)` on `Listing`,
maintained on write by `listings.service.ts`, which already computes that figure
through the shared `costOf`. Indexed, filterable, and it cannot disagree with the
card because both read the same helper. Costs a migration and a one-off backfill.

*If it is declined:* the filter runs against `rent` and the UI must say "rent",
not "budget" or "monthly cost". Honest, but much less useful — and it leaves the
renter's own `budget` field, which is in true-cost terms, unable to seed it.

---

## Out of scope

Tracked, not built here. The rest of Stage 3:

- Redis caching and invalidation
- `/favorites`
- `/discover`
- **40–50 seed listings.** Worth doing immediately after Phase 4 — the filter UI
  will look thin against the 6 rows currently in the database, and a filter that
  returns two results is hard to tell from a filter that is broken.

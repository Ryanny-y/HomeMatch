---
title: /profile — Renter Surface Spec
tags:
  - homematch
  - design/surface
  - stage/1
status: built
stage: 1
updated: 2026-08-03
---

# `/profile` — renter surface

Layout and wireframe spec for the renter's account and preferences page, plus the schema and
API that back it.

> **Status: built and working.** Schema, three migrations, `/api/profile`, and the page, its
> components, and the save flow (§3–§7).
>
> **Amended:** `/onboarding` is no longer a redirect to here — it is a real first-run gate, and
> `entryFor("renter")` points at it. `homeFor("renter")` still points here, and the two being
> briefly collapsed into one function is what made this page unreachable for a while; both
> amendments are in §11. The field set is six, not four: `preferredCity` and
> `preferredBarangays` were added when the catalog gained filters.
>
> This document stays the record of *why* the page is shaped as it is. Where it and the code
> disagree, the code is what shipped — see §11 for what changed during the build.

---

## 1. What this page is for

The roadmap files `/profile` under Stage 1 as a "renter preferences form — this data feeds
Stage 4." That undersells it. These fields are the **input side of the match score**: Stage
4's rules engine scores every listing *against them*. A renter who leaves this page empty does
not get a slightly worse experience — they get an unscored catalog, which is the competitor's
product.

So the page has two jobs, in this order:

1. Make a renter understand that what they enter here is the test every apartment gets graded
   against.
2. Let them enter it, and change it later, without friction.

**Visitor mode: Operate.** Scanability, familiar affordances, and the real usage scene
(mid-range Android, mobile data) outrank expression.

### Decisions already made

| Decision | Answer | Consequence |
|---|---|---|
| `/onboarding` | ~~Retired~~ → **a first-run gate** | Reversed. It renders *these* components, so there is still one field set and one schema — but it asks in sequence where `/profile` waits. Still no wizard and no stepper: one screen, one save, skippable. `/profile` remains the permanent edit surface. |
| Save model | One Save for the whole page | Not the landlord editor's per-field autosave. A sticky save bar appears when dirty. |
| Account fields | Display-only | No API exists to change name or email. No Edit button is drawn for either. |
| Field set | ~~Four~~ → **six** | Budget, household size, wants, other needs, plus `preferredCity` and `preferredBarangays`. The location pair is the odd one out: everything else here is *scored*, that pair is *filtered* on. |

### What this page deliberately does not ask

An earlier version of this spec carried nine fields: a move-in date and flexibility flag, a
deposit budget, a geocoded commute anchor, a transport mode, and a commute ceiling.

They were cut because **HomeMatch is inquiry-led, not booking-led.** Asking someone for a
move-in date and a deposit figure before they have seen a single unit is asking them to commit
to specifics they do not have yet, and every one of those fields was a row they would leave
blank. Location wants — "near UP Diliman" — now live in the renter's own words instead of a
map picker.

Do not reintroduce them without a reason that survives that argument.

---

## 2. The concept: one list, two ways in

**What this refuses.** The account-settings canon — avatar card, accordion groups of inputs,
Save at the bottom. That is correct for a page of unrelated toggles and wrong here, because it
renders the most consequential data in the product as housekeeping.

**What it is instead.** The page is a statement of what the renter wants, and it takes that
statement two ways: **checkboxes for the wants common enough to have a name, and a text box
for everything else.** They are not a primary input and an afterthought — they are the same
list, and a want typed in prose counts exactly as much as one that happened to have a box.

That framing is what the layout has to carry:

- Each line pairs its control with **what that line does to a score**, in its own column. This
  is the traceability claim of the product made on the *input* side; today it is only ever
  shown on the output side (`CriteriaList`, `CostBreakdown`).
- The text box gets the same visual weight as the checkbox grid. Rendering it as a small
  "notes" afterthought at the bottom would contradict the whole idea and quietly tell renters
  their real requirements do not count.

**The structural device is what each line does**, not a number. `01 / 02 / 03` would only
decorate — four fields are not a sequence.

### The truth constraint — read before building

The page renders:

- ❌ no computed match score
- ❌ no live "your score would be…" preview
- ❌ no claim, anywhere, that the text box is being read by an AI

The rules engine is Stage 4 and the extraction step (§8) does not exist. The text box is
labeled for what it does **today** — collect what the boxes miss — and the consequence column
states the rule in words, which is true now and stays true after Stage 4 ships. A plausible
score or a "our AI is analyzing this" flourish would be exactly the invented claim PRODUCT.md
forbids.

Sample values in the wireframes (`₱18,000`, `2`) are **illustrative only**.

---

## 3. Wireframe — desktop (≥1024px)

Container matches `/landlord`: `mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14`, inside
the existing `(shell)` layout. At four fields the whole page now sits close to one viewport.

```
════ SiteHeader — existing, sticky, unchanged ════════════════════════════════

  Your profile                                                          [h1]
  Every listing is scored against what's below. Change a line and the
  ranking changes with it.

  ┌─ Card tone="plain" ─────────────────────────────────────────────────────┐
  │  ┌────┐   Ryan Romero                        [Pill] Renter              │
  │  │ RY │   ryannymromero@gmail.com            [Pill] Email verified      │
  │  └────┘                                                                 │
  │  ─────────────────────────────────────────────────────────────────────  │
  │  Change password →                                                      │
  └─────────────────────────────────────────────────────────────────────────┘
     ↑ initials, not an upload — there is no avatar storage and none is planned

  WHAT GETS SCORED                                            [mono eyebrow]

  ┌─ Card tone="plain" ─────────────────────────────────────────────────────┐
  │  BUDGET                                                                 │
  │ ┌──────────────────────────────────┬───────────────────────────────────┐│
  │ │ Most you'd pay a month           │ Measured against true monthly     ││
  │ │ ┌──────────────────────────────┐ │ cost — rent plus every recurring  ││
  │ │ │ ₱  18,000                    │ │ charge — not the advertised rent. ││
  │ │ └──────────────────────────────┘ │                                   ││
  │ └──────────────────────────────────┴───────────────────────────────────┘│
  └─────────────────────────────────────────────────────────────────────────┘
             ~58% control column          ~42% consequence column
             (7 of 12 grid cols)          (5 of 12 grid cols)

  ┌─ Card tone="plain" ─────────────────────────────────────────────────────┐
  │  HOUSEHOLD                                                              │
  │ ┌──────────────────────────────────┬───────────────────────────────────┐│
  │ │ People moving in                 │ Sets the room count a unit needs  ││
  │ │ ┌──────────────────────────────┐ │ before it stops fitting.          ││
  │ │ │ 2                            │ │                                   ││
  │ │ └──────────────────────────────┘ │                                   ││
  │ └──────────────────────────────────┴───────────────────────────────────┘│
  └─────────────────────────────────────────────────────────────────────────┘

  ┌─ Card tone="plain" ─────────────────────────────────────────────────────┐
  │  WHAT YOU WANT                                                          │
  │                                                                         │
  │  Check anything that matters. Every box you tick moves a listing's      │
  │  score — none of them hides a listing from you.                         │
  │                                                                         │
  │  ┌───────────────────────┐ ┌───────────────────────┐ ┌────────────────┐ │
  │  │ [x] Pets allowed      │ │ [ ] Parking included  │ │ [ ] Own bathrm │ │
  │  └───────────────────────┘ └───────────────────────┘ └────────────────┘ │
  │  ┌───────────────────────┐ ┌───────────────────────┐ ┌────────────────┐ │
  │  │ [ ] Furnished         │ │ [x] Near transit      │ │ [ ] Aircon     │ │
  │  └───────────────────────┘ └───────────────────────┘ └────────────────┘ │
  └─────────────────────────────────────────────────────────────────────────┘

  ┌─ Card tone="plain" ─────────────────────────────────────────────────────┐
  │  ANYTHING ELSE                                                          │
  │ ┌──────────────────────────────────┬───────────────────────────────────┐│
  │ │ What the boxes don't cover       │ Counts the same as a ticked box.  ││
  │ │ ┌──────────────────────────────┐ │ Write it the way you'd say it —   ││
  │ │ │ Near UP Diliman, ground      │ │ a place, a distance, anything     ││
  │ │ │ floor, and somewhere I can   │ │ that would change your mind       ││
  │ │ │ park a motorbike.            │ │ about a unit.                     ││
  │ │ └──────────────────────────────┘ │                                   ││
  │ │                       412 left   │                                   ││
  │ └──────────────────────────────────┴───────────────────────────────────┘│
  └─────────────────────────────────────────────────────────────────────────┘
     ↑ full-width card, same weight as the grid above — not a footnote

╔═ sticky bottom · appears only when dirty ═══════════════════════════════════╗
║  2 unsaved changes                          [ Discard ]  [ Save profile ]   ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

**Why the consequence column is a column and not a tooltip.** It is the argument of the page.
Hiding it behind a hover target would put the product's differentiator behind an interaction
that does not exist on the device PRODUCT.md names as the default case.

---

## 4. Wireframe — mobile (<768px)

The consequence column collapses **underneath** its control as a hint — not a tooltip, not a
disclosure. The reason a line exists has to survive the phone.

```
┌───────────────────────────────┐
│ ☰  HomeMatch AI               │  ← existing SiteHeader
├───────────────────────────────┤
│                               │
│ Your profile                  │
│ Every listing is scored       │
│ against what's below.         │
│                               │
│ ┌───────────────────────────┐ │
│ │ ┌──┐  Ryan Romero         │ │
│ │ │RY│  ryannymromero@…     │ │
│ │ └──┘                      │ │
│ │ [Renter] [Email verified] │ │
│ │ ───────────────────────── │ │
│ │ Change password →         │ │
│ └───────────────────────────┘ │
│                               │
│ WHAT GETS SCORED              │
│                               │
│ ┌───────────────────────────┐ │
│ │ BUDGET                    │ │
│ │                           │ │
│ │ Most you'd pay a month    │ │
│ │ ┌───────────────────────┐ │ │
│ │ │ ₱  18,000             │ │ │  ← 48px tall, decimal keypad
│ │ └───────────────────────┘ │ │
│ │ Measured against true     │ │
│ │ monthly cost — rent plus  │ │
│ │ every recurring charge —  │ │
│ │ not the advertised rent.  │ │
│ └───────────────────────────┘ │
│                               │
│ ┌───────────────────────────┐ │
│ │ HOUSEHOLD                 │ │
│ │                           │ │
│ │ People moving in          │ │
│ │ ┌───────────────────────┐ │ │
│ │ │ 2                     │ │ │
│ │ └───────────────────────┘ │ │
│ │ Sets the room count a     │ │
│ │ unit needs before it      │ │
│ │ stops fitting.            │ │
│ └───────────────────────────┘ │
│                               │
│ ┌───────────────────────────┐ │
│ │ WHAT YOU WANT             │ │
│ │                           │ │
│ │ Check anything that       │ │
│ │ matters. Every box moves  │ │
│ │ a score — none of them    │ │
│ │ hides a listing from you. │ │
│ │                           │ │
│ │ ┌───────────────────────┐ │ │
│ │ │ [x] Pets allowed      │ │ │  ← 1-up under 480px
│ │ └───────────────────────┘ │ │     2-up from 480px
│ │ ┌───────────────────────┐ │ │     3-up at lg
│ │ │ [ ] Parking included  │ │ │
│ │ └───────────────────────┘ │ │
│ │ ┌───────────────────────┐ │ │
│ │ │ [ ] Own bathroom      │ │ │
│ │ └───────────────────────┘ │ │
│ │            ⋮              │ │
│ └───────────────────────────┘ │
│                               │
│ ┌───────────────────────────┐ │
│ │ ANYTHING ELSE             │ │
│ │                           │ │
│ │ What the boxes don't cover│ │
│ │ ┌───────────────────────┐ │ │
│ │ │ Near UP Diliman,      │ │ │
│ │ │ ground floor, and     │ │ │
│ │ │ somewhere I can park  │ │ │
│ │ │ a motorbike.          │ │ │
│ │ └───────────────────────┘ │ │
│ │              412 left     │ │
│ │ Counts the same as a      │ │
│ │ ticked box. Write it the  │ │
│ │ way you'd say it.         │ │
│ └───────────────────────────┘ │
├───────────────────────────────┤
│ 2 unsaved changes             │
│ ┌─────────┐ ┌───────────────┐ │
│ │ Discard │ │ Save profile  │ │  ← sticky, full-width,
│ └─────────┘ └───────────────┘ │     clears the safe area
└───────────────────────────────┘
```

### Breakpoint behavior

| Range | Control + consequence | Checkbox grid | Save bar |
|---|---|---|---|
| `<480px` | stacked, hint below control | 1-up | stacked, full-width buttons |
| `480–767px` | stacked, hint below control | 2-up | inline |
| `768–1023px` | stacked, hint below control | 2-up | inline |
| `≥1024px` | 7/5 two-column | 3-up | inline, right-aligned |

The consequence text only becomes a side column at `lg`; between `md` and `lg` the container
is too narrow for a 5-column text block to hold a comfortable measure.

---

## 5. State matrix

| State | Behavior |
|---|---|
| **First run — nothing set** | All cards render empty, with a `Card tone="brand"` above them carrying the empty-state copy (§6). **This is no longer the only first-run surface** — `/onboarding` now asks the same questions in sequence before a renter ever reaches here. This state remains for someone who skipped it, or who cleared everything later. |
| **Partial** | Nothing special. Four fields all visible at once need no progress meter — a counter would restate what the reader can already see. |
| **Clean** | The save bar is **absent**, not present-and-disabled. Nothing is owed, so nothing is shown. |
| **Dirty** | Save bar slides up (`--dur-move`, `--ease-arrival`), counting changed fields. `Discard` restores server values without a confirm — nothing here is destructive enough to earn a dialog. |
| **Saving** | Primary button reads `Saving…` and disables. Fields stay editable; a slow connection must not lock the form. |
| **Saved** | Bar swaps to a `live`-toned confirmation, `role="status"`, auto-dismissing after ~3s. |
| **Validation error** | Fields validate **on blur**, so a bad figure is caught where it was typed. Save re-validates the whole page and moves focus to the first invalid field. Errors render inline through `Field.tsx`'s existing `aria-invalid` + `aria-describedby` wiring — never as a top-only summary. |
| **Request error** | `Alert tone="error"` above the save bar with the envelope's `error.message`. The renter's edits are **not** discarded. |
| **Loading** | Skeleton mirroring the card rhythm — one short block for the identity card, four for the fields — matching `LandlordDashboard`'s `Skeleton` approach, with `aria-busy` and an `sr-only` "Loading your profile." |
| **Email unverified** | The identity card's second pill turns gold and reads `Email not verified`, with a real `Resend verification email` action wired to the existing `resendVerification()`. |
| **Wrong role** | A landlord or admin reaching `/profile` is redirected via `homeFor(user.role)`, exactly as `/dashboard` already does. The API 403s them regardless. |
| **Signed out** | The `(shell)` guard sends them to `/login`. |

### No dead controls

- `Change password →` → `/forgot-password`, a built route that works for a signed-in user
  (it emails a reset link). The copy says so, so the destination is not a surprise.
- `Resend verification email` → the existing `resendVerification()` in `auth.api.ts`.
- Full name and email are **display-only text**. No API exists to change either, so no Edit
  affordance is drawn.

---

## 6. Copy deck

Every string on the page, in the product's voice — plain, specific, unafraid of the downside.

### Page furniture

| Slot | Copy |
|---|---|
| `<title>` | `Your profile` |
| h1 | `Your profile` |
| Lede | `Every listing is scored against what's below. Change a line and the ranking changes with it.` |
| Section eyebrow | `WHAT GETS SCORED` |

### Empty state (first run)

Shown until `canScoreListings()` returns true — a budget plus at least one want or some
written needs:

> **Nothing is weighed yet.**
> Set a budget and tell us what you're after, and listings get ranked against it. Until then
> they come back in the order they were posted.

### Identity card

| Slot | Copy |
|---|---|
| Role pill | `Renter` |
| Verified pill | `Email verified` |
| Unverified pill | `Email not verified` |
| Unverified body | `Some features stay locked until you confirm the address.` |
| Resend action | `Resend verification email` |
| Resend sent | `Sent. Check {email} — the link expires in an hour.` |
| Password action | `Change password` |
| Password hint | `We'll email you a link.` |

### Fields

| Group | Label | Consequence copy |
|---|---|---|
| `BUDGET` | `Most you'd pay a month` | `Measured against true monthly cost — rent plus every recurring charge — not the advertised rent.` |
| `HOUSEHOLD` | `People moving in` | `Sets the room count a unit needs before it stops fitting.` |
| `WHAT YOU WANT` | — | Group copy: `Check anything that matters. Every box you tick moves a listing's score — none of them hides a listing from you.` |
| `ANYTHING ELSE` | `What the boxes don't cover` | `Counts the same as a ticked box. Write it the way you'd say it — a place, a distance, anything that would change your mind about a unit.` |

Placeholder for the text box: `Near UP Diliman, ground floor, somewhere I can park a motorbike…`

### Checkbox labels and hints

| Label | Hint |
|---|---|
| `Pets allowed` | `Cats and dogs both count.` |
| `Parking included` | `A slot with the unit, not street parking.` |
| `Own bathroom` | `Not shared with another unit.` |
| `Furnished` | `At least a bed and a place to cook.` |
| `Near transit` | `Walking distance to a jeepney, bus, or train.` |
| `Aircon` | `Installed, not just an outlet for one.` |

Each hint is also the landlord's wording for the same field in `EditListingForm`. Both sides
describe one fact, so a renter ticking "near transit" has to mean what the landlord ticked.

### Save bar

| Slot | Copy |
|---|---|
| Dirty, one | `1 unsaved change` |
| Dirty, many | `{n} unsaved changes` |
| Discard | `Discard` |
| Primary | `Save profile` |
| Saving | `Saving…` |
| Saved | `Profile saved.` |
| Invalid | `{n} fields need attention` |

### Errors

Same shape as `packages/shared/src/auth.ts` — the interface's voice, stating what to do. These
strings live in `updateRenterPreferenceSchema` so the API and the form return the identical
text:

| Field | Error |
|---|---|
| Budget, non-positive | `Enter an amount above zero.` |
| Budget, implausible | `That's above ₱1,000,000 a month. Check the figure.` |
| People moving in, out of range | `Enter a number between 1 and 12.` |
| Anything else, too long | `Keep this under 500 characters.` |
| Request failure | Whatever the envelope's `error.message` says — no substitution. |

---

## 7. Components

### Reused as-is

| Path | Used for |
|---|---|
| `frontend/src/components/ui/Field.tsx` | `NumberField` (has ₱ `prefix`), `TextareaField`, `CheckboxField` |
| `frontend/src/components/ui/Card.tsx` | `Card` (`plain` / `brand` tones), `Pill` |
| `frontend/src/components/ui/Button.tsx`, `Alert.tsx` | actions, request errors |
| `frontend/src/lib/session.ts` | `currentUser()` for the identity block |
| `frontend/src/lib/site.ts` | `homeFor()` for the role guard |
| `frontend/src/features/auth/api/auth.api.ts` | `resendVerification()` |
| `frontend/src/features/auth/hooks/useZodForm.ts` | form state + flattened Zod issues |

### New components this page needs

| Component | Why |
|---|---|
| `RubricRow` | The 7/5 two-column layout pairing a control with its consequence, collapsing to stacked below `lg`. Wraps any `Field.tsx` control; owns no input logic. |
| `RubricGroup` | Card + group name + optional group copy. |
| `SaveBar` | Sticky dirty / saving / saved / invalid bar. |

Three, down from seven. `RadioGroupField`, `AnchorChips`, `ProgressLine`, and `ScoringRoleTag`
are all **no longer needed** — the transport radio, the anchor picker, the nine-line meter, and
the scoring-role tags went with the fields they served.

All live in `frontend/src/features/profile/components/`, with `ProfileScreen` as the only
public export in `features/profile/index.ts`. None is generic enough for `src/components/`,
which is for components with 2+ feature consumers.

Built alongside them: `IdentityCard`, `WantsGrid`, `ProfileScreen`, the `useProfile` /
`useSaveProfile` query hooks, and `useProfileDraft`, which owns the draft, the dirty count, and
validation so the components stay presentational.

### Design tokens — the colour contract holds

`globals.css` binds six hues 1:1 to cost lines and says a decorative use of one is a bug. This
page therefore uses:

| Role | Token | Where |
|---|---|---|
| Action | `--color-brand` | Save, links, focus rings, empty-state card |
| Work still owed | `--color-gold` / `--color-gold-ink` | Unverified email |
| Confirmed | `--color-live-*` | Verified pill, saved confirmation |
| Error | `--color-danger` | Field errors, error alert |
| Everything else | ink ramp + `--color-line` | Group names, consequence text, checkbox rows |

**The six cost hues appear nowhere on this page.** The ₱ budget figure carries `[data-figure]`
for tabular alignment.

Type is the existing stack: Plus Jakarta Sans throughout, JetBrains Mono for the uppercase
eyebrow and group names only — never for amounts, per the note in `globals.css`.

### Motion

One purposeful move: the save bar's entrance (`--dur-move`, `--ease-arrival`). Nothing else
animates. The landing page's `Reveal` machinery is scoped to the landing page and does not come
here — an Operate surface does not need its form to make an entrance.

---

## 8. The schema and API — **built**

Two migrations: `20260803125001_add_renter_preferences` created the table, and
`20260803132413_simplify_renter_preferences` cut it down to the four fields in §1. The second
ran against an empty table, so no data was lost and no reset was needed.

`backend/prisma/schema/renter-preference.prisma` — one enum, four writable columns:

| Column | Type | Notes |
|---|---|---|
| `userId` | `String @unique @db.Uuid` | FK → `User`, cascade delete |
| `budget` | `Decimal? @db.Decimal(12,2)` | compared to true monthly cost, never advertised rent; Decimal because `listings.rent` is |
| `householdSize` | `Int?` | 1–12 |
| `wants` | `RenterWant[]` | `pets`, `parking`, `own_bathroom`, `furnished`, `near_transit`, `aircon` |
| `otherNeeds` | `String? @db.VarChar(500)` | scored input, not a note |

One flat `RenterWant` list replaced the earlier `RenterRequirement` (disqualifying) and
`RenterPriority` (weighted) split. Which wants are truly non-negotiable varies per renter and
per search, and asking someone to declare it up front gets a worse answer than reading it out
of `otherNeeds` later.

### Every want maps 1:1 to a listing field

This is the invariant that keeps the list short, and the reason it is six values rather than
nine. A want with nothing on the listing to compare against cannot be scored — it is data the
product collects and never uses.

| Want | Listing field |
|---|---|
| `pets` | `petsAllowed` |
| `parking` | `parkingAvailable` |
| `own_bathroom` | `bathroomAccess == private` |
| `furnished` | `furnished` |
| `near_transit` | `nearTransit` |
| `aircon` | `aircon` |

`quiet_street`, `laundry` and `step_free` were removed because nothing on a listing answered
them. `furnished`, `nearTransit` and `aircon` were added to `Listing` in the same change, in
migration `20260803223144_align_listing_amenities_with_wants`.

**Adding a want means adding its listing field in the same change.** The enum comment in
`renter-preference.prisma` says so too, because this is the rule most likely to be broken by
someone adding "just one more checkbox".

`nearTransit` is a boolean rather than the station name an earlier schema draft carried: the
want is binary, and a landlord naming the specific stop belongs in `description`, where a
renter can read it.

### API

`backend/src/features/profile/`, mounted at `/api/profile`, `requireRole("renter")` on the
whole router — a landlord or admin gets 403, since neither is scored against listings.

| Route | Behavior |
|---|---|
| `GET /api/profile` | Returns the caller's profile, or `EMPTY_RENTER_PREFERENCE` when nothing is saved. **Never 404** — a first visit must render, not look like a failure. |
| `PATCH /api/profile` | Partial upsert. Only keys actually sent are written: `undefined` (absent) and `null` (clear) reach Prisma identically, so passing every key through would turn each unsent field into a wipe. An empty `wants` array is a real edit and is written. |

### Shared contract

`packages/shared/src/renter-preference.ts` holds `renterWantSchema`,
`updateRenterPreferenceSchema`, `RenterPreferenceDto`, `EMPTY_RENTER_PREFERENCE`, the bounds,
and `canScoreListings()` — the rule behind the empty state, kept in one place so the copy and
the logic cannot drift.

### The future AI step, and what it may not do

`otherNeeds` exists to be read by a later **extraction** step: an LLM turns prose ("somewhere
furnished and near a train") into structured `wants` entries (`furnished`, `near_transit`). The
deterministic rules engine then does the scoring, exactly as today.

This is the locked hybrid architecture in `CLAUDE.md` and PRODUCT.md, not a workaround for it:
**the LLM converts, the rules score, every number stays traceable to a stored field.** An
implementation where the model reads listings and emits a match score directly would need
those two documents changed deliberately first.

Until extraction ships, `otherNeeds` is stored and shown back to the renter, and nothing on
screen may suggest otherwise.

**Still to build:** the page and the three components in §7.

---

## 9. Accessibility checklist

Against `frontend/CLAUDE.md`'s floor, which is non-negotiable:

- [ ] One `<h1>` (`Your profile`); each group is an `<h2>`; no level skipped
- [ ] `<main>` landmark; header and footer come from the existing shell
- [ ] Every input has a visible `<label>` — `Field.tsx` already enforces this
- [ ] Errors wired via `aria-invalid` + `aria-describedby`, never colour alone
- [ ] The consequence column is the field's `aria-describedby` target, so it is announced with
      the control rather than orphaned beside it
- [ ] The checkbox grid is a real `<fieldset>` + `<legend>`
- [ ] Focus moves to the first invalid field on failed submit
- [ ] Visible focus ring everywhere; the global `:focus-visible` rule is not overridden
- [ ] Every tap target ≥44px — `CheckboxField`'s row-as-target already clears this
- [ ] The character counter on `otherNeeds` is `aria-live="polite"` and does not announce on
      every keystroke
- [ ] Save bar's saved confirmation is `role="status"`; the error alert is `role="alert"`
- [ ] Sticky save bar never covers the field being edited — the page reserves its height
- [ ] `prefers-reduced-motion` respected on the save bar entrance
- [ ] Decorative icons `aria-hidden`; the initials block is `aria-hidden` with the real name in
      text beside it
- [ ] The ₱ figure uses `[data-figure]` and stays legible at 320px — a truncated peso figure is
      a correctness bug on this product

---

## 10. Open decisions

1. **Editing name and email.** Still display-only because no API exists. Adding one is a
   backend decision (email changes need re-verification), not a layout one.
2. **Delete account.** Not in this spec, not in the roadmap, no endpoint. Worth deciding before
   public renter access opens.
3. **Growing the `wants` list.** Nine values today. Adding one is a migration plus a copy line;
   the list should grow from what renters actually write in `otherNeeds`, once there is enough
   of it to read.
4. **`/dashboard` for renters.** Now unreachable by normal navigation — `homeFor("renter")`
   points at `/profile`, so the renter dashboard's `ComingSoon` shell is only seen by someone
   typing the URL. It should either become a real screen or be removed.

### Resolved during the build

- ~~**`/onboarding`** redirects to `/profile` rather than being deleted, since it has been linked
  from copy and may be bookmarked.~~ **Amended — it is a real page again.** See below.
- **Entry point:** ~~`homeFor()` in `lib/site.ts` is the single definition the login form, the
  `/dashboard` redirect, and the header all read, so changing it moves all three at once rather
  than patching the header alone.~~ **Amended twice — see below.** There are now two functions,
  because that was one definition answering two questions.

### Amended after the build — `/onboarding` un-retired

The original decision was right about the cost it was avoiding: **two surfaces over one set of
fields, drifting apart.** That cost is not being paid. `/onboarding` renders this page's own
`RubricGroup`, `WantsGrid` and `LocationCard`, driven by the same `useProfileDraft` and validated
by the same shared schema. There is one field set and one set of rules.

What it adds is the thing an edit surface structurally cannot do: **it asks.** `/profile` is
correct as a place to change your mind and wrong as a place to be introduced to the product — it
waits, and a renter with nothing set has no reason to know why they should fill it in. The empty
state did first-run duty honestly, but passively.

The half of the original decision that stands, and should keep standing: **no wizard, no
stepper.** One screen, one save, and a real Skip. `EMPTY_RENTER_PREFERENCE` exists because a
partial profile is a first-class state; a gate that will not let someone past would contradict it.

**How it decides whether to show itself:** `RenterPreference.onboardedAt`, stamped by
`POST /api/profile/onboarded` on save *or* skip, idempotently. The check lives on the page rather
than in `LoginForm`, so it also covers a bookmark, a typed URL, and a session resumed from a
refresh token — none of which pass through the login form. `?next=` still wins, so a renter
bounced off a deep link by the login wall lands where they were going.

---

## 11. What changed during the build

Where the code diverges from §1–§9, and why.

- **Budget and Household have no group description.** The spec gave every group a line of copy;
  those two say everything they need in the consequence column, and a sentence above it only
  repeated the one beside it.
- **The character counter is hidden until the field has content.** "500 left" over an empty box
  announces a limit nobody is near.
- **`Field.tsx` gained an optional `describedBy` prop.** The consequence is rendered outside the
  field, so it needed a way to become the input's `aria-describedby` target — otherwise the
  explanation is loose text beside the control rather than part of it. Additive; every existing
  caller is unaffected.
- **`globals.css` gained a `bar-in` utility** for the save bar's entrance, alongside the existing
  `panel-in`. Custom animation goes through `@utility` here, never arbitrary values.
- **The draft resyncs from the server's response after a save.** `toPayload` trims text the draft
  still held untrimmed, so anything typed with a trailing space compared unequal forever and the
  page stayed dirty after a successful save. Found by reading the state flow, then reproduced in
  the browser and fixed.

### Amended again — `homeFor` split into `homeFor` + `entryFor`

The single-definition `homeFor()` recorded above was correct while "where does this role's
session start?" and "where is this person's own area?" had the same answer. Putting a gate in
front of the first one made them different, and the collapsed definition then broke the second.

**The failure, because it is worth being able to recognise again.** `homeFor("renter")` was
pointed at `/onboarding` so login would hit the gate. `SessionActions` builds the header's
account link from the same call, and labels it *"Your profile"*. So for an onboarded renter:

```
click "Your profile" → /onboarding → onboardedAt is set → redirect → /browse
```

`homeFor` was the **only** link to `/profile` in the app, so the page became unreachable — while
`OnboardingScreen` was still promising "you can change any of them later on your profile".

Now:

| Function | Question it answers | Renter |
|---|---|---|
| `homeFor(role)` | Where does this role live? | `/profile` |
| `entryFor(role)` | Where does a session begin? | `/onboarding` |

`entryFor` defers to `homeFor` for every other role rather than restating those routes. The rule
for callers: **a bounce uses `homeFor`, a session entry uses `entryFor`.** The login form and
`/dashboard` are entries; the header link and every wrong-role redirect are not.

This regression reached a person rather than CI because there is still no frontend test runner.
`homeFor`, `entryFor` and `safeNext` are pure functions over a role and a string — the cheapest
possible tests, and currently untested.

---
title: /admin — admin surface
tags: [homematch, design/surface, stage/1, stage/2]
status: built
stage: 1
updated: 2026-08-04
---

# `/admin` — admin surface

Three pages for the founder-as-admin: what is in the database, who the accounts are, and every
listing across every owner.

> **Built.** Where this document and the code disagree, the code is what shipped — see §8.
>
> **Deliberately shorter than [[profile-surface]].** `PRODUCT.md:20` caps admin design effort:
> admin tooling "stays utility-grade and should not consume design effort that belongs to the
> other two". A 600-line spec here would itself breach that line.

---

## 1. What these pages are for

| Page | Question it answers |
|---|---|
| `/admin` | What is actually in the database right now? |
| `/admin/users` | Who has an account, and what can I do about one? |
| `/admin/listings` | What is in the catalog, across every owner, and what is blocking it? |

### Decisions already made

| Decision | Answer | Consequence |
|---|---|---|
| UI system | shadcn/ui, scoped to `/admin` | `components/shadcn/`, never merged with `components/ui/` |
| Overview data | counts over existing rows only | No views, saves, interest or conversion |
| User actions | no schema change | Role, resend verification, force sign-out, delete. **No suspension.** |
| Listing actions | reuse `/api/listings/:id` | No new endpoints; no unpublish |
| Filter state | the URL | Reload, back, and paste all work |

### What these pages deliberately do not do

- **No suspension.** There is no `suspendedAt` column, so the only lever against a bad actor is
  deletion. That is a real gap, chosen to avoid a migration; revisit it before public signup.
- **No quick-add seeding.** Stage 2's "admin bulk/quick-add" is still unbuilt. `/admin/listings`
  manages, it does not seed.
- **No audit log.** Stage 5. Actions here are not recorded anywhere.
- **No bulk actions.** Hence no row-selection checkboxes — a control with nothing behind it.

---

## 2. The truth constraint — read before changing the overview

Every figure is a `COUNT`, `AVG` or `MIN`/`MAX` over rows that exist. Nothing tracks behaviour,
so the page must never render:

- ❌ page or listing views, saves, favourites, enquiries, conversion
- ❌ month-over-month percentages on a four-row table
- ❌ revenue, MRR, active users, session counts
- ❌ a trend arrow or sparkline with no series behind it
- ❌ placeholder or seeded-for-looks chart data

The page says this in its own words at the foot of the overview, because a dashboard with no
traffic numbers invites the question and answering it in the interface is more honest than
letting a reader assume the data is missing by accident.

`publishedRent` is `null` — and the card says so — rather than `0` when nothing is published.

---

## 3. Layout

Sidebar rail plus a header that names the page. `/admin` sits **outside** the `(shell)` route
group: that group renders `SiteHeader` and `SiteFooter`, and a dashboard with its own nav does
not want the marketing header stacked on top.

```
┌────────────┬──────────────────────────────────────────────────────┐
│ HomeMatch  │ ▣  Overview                                          │
│            │    What is actually in the database right now.       │
│ ▸ Overview ├──────────────────────────────────────────────────────┤
│   Users    │ ┌ ACCOUNTS ┐┌ LISTINGS ┐┌ LIVE ─────┐┌ BLOCKED ────┐ │
│   Listings │ │    4     ││    8     ││    4      ││     2       │ │
│            │ │ 1 renter ││ 3 draft  ││ of 8      ││ drafts …    │ │
│            │ │ +4 / 7d  ││ +8 / 7d  ││           ││ → filtered  │ │
│            │ └──────────┘└──────────┘└───────────┘└─────────────┘ │
│            │ ┌ Accounts created ────┐┌ Listings created ────────┐ │
│            │ │  ▁▁▁▁▁▁▁▁▁▁▂▁▁  bars ││  ▁▁▁▁▁▁▁▁▁▁█▁▁           │ │
│            │ │  ▸ 4 signups — days  ││  ▸ 8 listings — days     │ │
│            │ └──────────────────────┘└──────────────────────────┘ │
│            │ ┌ Email verification ──┐┌ Published rent ──────────┐ │
│            │ │ 75%                  ││ ₱12,250                  │ │
│            │ └──────────────────────┘└──────────────────────────┘ │
│ ⧉ Back to  │ ⓘ Every figure here is a count of rows…              │
│   the site │                                                      │
└────────────┴──────────────────────────────────────────────────────┘
```

*Figures above are from the dev database and are illustrative.*

Tables are the same shape on both list pages: toolbar (search + facets + Clear), table, then
`31–60 of 214` with Previous/Next. The sidebar collapses to icons; below `md` it becomes a
sheet behind the trigger.

---

## 4. The chart, and why it is two charts

Signups and listings are different **kinds** of thing, so a grouped bar chart would need a
categorical pair to tell them apart. The colour contract does not leave one: the six
`--color-cat-*` hues identify cost lines and nothing else, and the only other free colour is a
near-neutral slate that fails the chroma floor a categorical palette needs.

Small multiples remove the question. One series each, both `--color-brand`, validated:

```
Palette (light, categorical): 1 slot
  [PASS] Lightness band · Chroma floor · Contrast vs surface ≥ 3:1
```

No legend — with one series the title names it. Each panel carries a `<details>` table of the
non-zero days, because a bar chart is not readable by a screen reader and squinting at 30 bars
is a poor way to read an exact figure either.

Days are bucketed in **Asia/Manila**, not UTC. Quezon City is UTC+8, so ISO bucketing would file
anything before 8am local under the previous day.

---

## 5. State matrix

| State | Behaviour |
|---|---|
| Loading (overview) | Skeleton cards and panels, `aria-busy`, `sr-only` "Loading the overview." |
| Loading (table) | Skeleton rows; the previous page stays visible while the next loads, so paging does not blank the layout |
| Empty (filtered) | In-table message naming the filter to relax — never a bare "no results" |
| Empty (no data) | "No signups in the last 30 days." in place of the chart |
| Error | `Alert tone="error"` with the envelope's message |
| Action succeeded | `role="status"` live region plus a visible `Alert tone="info"` |
| Protected row | Menu items **disabled with the reason stated**, never hidden |
| Publish blocked | Publish disabled, and the menu names the missing fields |
| Wrong role | Redirected via `homeFor(role)`; the API 403s regardless |
| Signed out | Redirected to `/login` |

---

## 6. Copy that carries a decision

| Slot | Copy |
|---|---|
| Overview footnote | "Every figure here is a count of rows in the database. Views, saves and enquiries aren't tracked yet, so they aren't shown — a number you can't check is worse than no number." |
| Blocked tile | "Drafts missing something renters need" |
| No published rent | "Nothing is published yet, so there is no rent to average. Drafts and archived units are deliberately excluded — nobody can rent them." |
| Protected row (self) | "This is your own account" |
| Protected row (admin) | "Admins are managed from the server" |
| Publish blocked | "Can't publish yet — missing description, at least one photo." |
| Delete user, with listings | "This also deletes their N listings and every photo on them. There is no undo, and no way to restore the photos afterwards." |
| Delete listing | "Archiving hides it from renters and keeps it — prefer that unless the listing was a mistake." |
| Rent card caveat | "Advertised rent, not true monthly cost." |

Destructive copy names the consequence and offers the reversible alternative. Both confirmations
cancel with "Keep it", matching `ConfirmDialog`.

---

## 7. Accessibility

- Tables carry `aria-label`; sortable headers are real `<button>`s and set `aria-sort`.
- Row action triggers carry `sr-only` "Actions for {name}".
- Action outcomes go to a polite live region; focus returns to the trigger on dialog close.
- The chart has a table alternative; money uses `data-figure` for tabular numerals.
- Pagination is a labelled `<nav>` and states position in rows, not pages.

---

## 8. Schema and API — built

No schema change beyond three indexes (`users.role`, `users.createdAt`, `listings.createdAt`),
migration `20260803183033_add_admin_list_indexes`.

```
GET    /api/admin/overview                        counts + two 30-day series
GET    /api/admin/users                           paginated, filtered, sorted
PATCH  /api/admin/users/:id/role                  renter ↔ landlord
POST   /api/admin/users/:id/resend-verification
POST   /api/admin/users/:id/sign-out              revokes refresh families
DELETE /api/admin/users/:id                       cascades
GET    /api/admin/listings                        every owner
GET    /api/admin/listings/barangays              real values for the filter
```

One gate for the router: `requireAuth, requireRole("admin")`.

**Listing mutations have no admin endpoint.** `listings.service.ts` already returns any row to
an admin, so publish, archive, edit and delete go through `/api/listings/:id`. A second path to
the same write is a second place for the ownership rule to be got wrong.

**Guard rails live in the service**, which answers *whether*, after the middleware answered
*who*: no acting on your own account, none on another admin, and the role body reuses
`userRoleSchema`, so `admin` stays unmintable through the API. A role change revokes the
target's refresh families in the same transaction — otherwise the old `role` claim outlives the
demotion by up to the access-token TTL.

`paginationMeta()` had existed with zero call sites since it was written; this is its first
consumer, and `PaginationMeta` moved into `packages/shared` so the client can type the pager.

---

## 9. Open decisions

1. **Suspension.** Deletion is currently the only lever. A `suspendedAt` column plus a login
   check is the reversible version, and is the thing to add before public signup.
2. **Audit log.** Nothing records who did what. Stage 5.
3. **Quick-add seeding.** Stage 2's row is still open, and Stage 3 wants 40–50 listings.
4. **Editing another owner's listing** opens the landlord editor, so an admin lands in landlord
   chrome. Accepted for now; a shared editor shell would fix it.
5. **`/dashboard`** is now unreachable for every role, `homeFor` having an answer for each. It
   should become a real screen or be deleted.

---

## 10. What changed during the build

- **Two charts, not one.** A grouped bar chart needed a categorical pair the colour contract
  could not supply. Caught by running the palette validator instead of eyeballing it.
- **`PaginationMeta` moved to `packages/shared`.** The client needed to type `meta`, and
  duplicating the type would have broken the "shared owns the envelope" rule. `apiGetPage` was
  added alongside it, since `apiGet` unwraps to `data` and drops `meta` — it throws on a missing
  meta rather than defaulting the total to zero, because a pager silently reading "1 of 1" is
  worse than a visible error.
- **`withReadiness` exported from `listings.service`.** The admin table renders a listing
  through the same mapper rather than a second `toDto` that would drift.
- **`homeFor("admin")` now returns `/admin`.** It previously returned `/landlord` with a comment
  saying `/admin` did not exist. `SessionActions` labelled admins "Your units"; it now says
  "Admin".
- **Search resets via a render-phase adjustment, not an effect.** Syncing the input to the URL
  in `useEffect` paints the stale term and then corrects it; a `key` reset would drop focus
  mid-typing.

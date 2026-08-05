# The catalog — `/browse` and `/listings/[slug]`

Where a signed-in renter looks at what is available. Both pages require an
account.

---

## 1. What it is for

`/browse` answers "what can I actually afford here?", not "what exists here". That
distinction is the whole reason the card is shaped the way it is.

`/listings/[slug]` answers "what would living here really cost, and what am I
getting?" — in that order, because the cost is the part no other listing site
will tell you.

## 1a. Access

**Both pages, and the API behind them, require a session.**

- `catalogRouter` sits behind `requireAuth`, so an anonymous request to
  `/api/catalog` is a 401. That is the actual boundary.
- The pages call `requireUser(next)` from `lib/session.ts`, which redirects to
  `/login?next=…`. That is convenience, not protection — skipping it would show
  an error page, not leak a catalog.
- The gate is **authentication, not role**. A renter, a landlord and an admin
  see the same rows. A `requireRole` here would invent a rule the product does
  not have.

Consequences worth knowing:

- **Nothing here is indexed.** `robots.ts` disallows both paths, both pages
  send `noindex`, and the sitemap lists neither. A crawler following either URL
  is redirected, so what it would index under a listing's name is the login form.
- **Pasted listing links do not unfurl.** Messenger and Viber fetch previews
  unauthenticated and get bounced. `generateMetadata` keeps its OpenGraph block
  anyway — it costs nothing and is correct again the day anything is ungated.

This contradicts `HomeMatch_AI_Build_Roadmap.md:137` (*"As anyone, I can view a
published listing's detail page"*) and `:149`, which calls `/listings/:id` a
public page. It matches `PRODUCT.md:114`, which lists `/browse` in the
authenticated shell. Recorded as a divergence in `BUILD-CHECKLIST.md`.

---

## 2. The card, and why the big number is not the rent

```
┌────────────────────────────────┐
│  ┌──────────────────────────┐  │  photo inset 12px, its own radius
│  │ ⬤ Utilities included     │  │  conditional, real fields only
│  │        4:3 photo         │  │
│  └──────────────────────────┘  │
│  ₱25,500  per month            │  ← true monthly cost
│  ₱24,000 rent + ₱1,500 parking │  ← the receipt
│  Teachers Village two-bedroom  │  h2, 2-line clamp
│  Teachers Village East · QC    │
│  ──────────────────────────────│
│  ⌂ 2 Beds │ ⌁ 1 Bath │ ⛁ Park  │  hairline vertical rules
│  ──────────────────────────────│
│  LISTED 3 DAYS AGO             │  real publishedAt
│  [      View details       ]   │  brand blue, full width
└────────────────────────────────┘
```

Every competitor puts advertised rent in the headline slot. A ₱24,000 unit with
₱1,500 of parking costs ₱25,500 to live in, and which of those two numbers a
renter sees first is the entire claim this product makes. The receipt sits
directly beneath so the figure is checkable rather than asserted.

Adapted from the left-hand card of a supplied reference (Dribbble `47338043`).
The right-hand treatment — full-bleed photo, dark scrim, text overlaid — was not
taken: the app is `color-scheme: light` end to end, and white text over an
uncontrolled landlord photo is a contrast gamble.

### What the card deliberately does not carry

| Not shown | Why |
|---|---|
| A "Prime Pick" or ranking badge | Nothing in the schema ranks a listing. `PRODUCT.md` forbids invented social proof, and a fabricated pick is exactly that. The slot carries a real binary instead — utilities included, gender policy, furnished — and is empty when none applies |
| Match score | Gold means the score, and scoring is Stage 4. No dead UI for unbuilt features |
| A `live` badge | Every card here is published by construction, so the badge would carry no information |
| Views, saves, ratings, "popular" | Nothing tracks them |
| Carousel dots | Every listing currently has exactly one photo; dots would advertise images that do not exist |
| The landlord's name | Real personal data. Publishing it on a public page is a privacy decision nobody has made |
| Red for the cost gap | See below |

---

## 3. Colour

The contract in `globals.css` binds, and two of its rules are easy to breach here.

**`--color-danger` appears once, on the detail page.** The contract reserves it
for the rent-versus-true-cost gap and says *once*. A grid of red deltas would
turn a fact into an alarm and leave nothing for the page where the gap gets its
full statement. The card states the same fact in neutral ink.

**The `--color-cat-*` hues appear only in the cost breakdown.** A live listing
resolves to three of them — rent, parking, and one `other` line that takes
`--color-cat-dues`. The bar segment and the dot beside its row read from one map
in `CostPanel`, so they are one fact drawn twice and cannot drift.

`CostPanel` is not `components/product/CostStatement`. That component is bound to
the landing page's six-category fixture and carries the authored motion sequence,
neither of which belongs on a listing page. **The arithmetic is shared** —
`computeTrueMonthlyCost`, `totalMonthlyCost` and `moveInTotal` all come from
`@homematch/shared` — and only the drawing is local.

---

## 4. Move-in is never a monthly number

Deposit and advance are shown in their own card, as a single figure, labelled as
due at signing. They are not amortised into the monthly cost and must not be:
the shared package carries the full reasoning on `computeTrueMonthlyCost`, which
records that folding them in once made a ₱5,000 unit report ₱6,450 a month under
a label that gave no hint it had been derived.

---

## 5. States

| State | Treatment |
|---|---|
| Rent is the whole cost | "Rent only, nothing on top" on the card; a neutral note on the detail page. Never a one-item breakdown, which reads as a rendering bug |
| No photo | A composed `surface-sunken` frame with an icon. Unreachable in normal operation — readiness gates publication on a photo — so it only fires if an object goes missing from storage |
| Empty catalog | "Nothing is published yet", not "no results". There are no filters, so empty can only mean nothing is live |
| Page past the end | A separate message with a link back to page one. `?page=9` against four listings returns no rows, and claiming nothing is published there would be a lie the reader can disprove by clicking back |
| A mangled `?page=` | Falls back to page one. The schema rejects `0` and `abc` rather than clamping them, so the page uses `safeParse`; a typo in the address bar should not render a 500 |
| Signed out | Redirect to `/login?next=…`, carrying the page number, so a deep link survives the wall |
| Draft, archived, or unknown slug | All three 404, identically. Distinguishing them would let anyone enumerate what landlords are still drafting |

---

## 6. What is not here yet

- **No filters, search or sort.** Stage 3.
- **No map, no commute figures.** The coordinates exist, but `ListingCommute`
  ships empty until Stage 4's routing job, and a travel time with nothing behind
  it is the invented number this product refuses.
- **No favourites, no compare.** Stages 3 and 4.
- **No "similar listings".** Meaningless at four.

---

## 7. Known content gap

The seeded photos are 160×160 test PNGs. The layout upscales them into a 4:3
frame and they look soft. That is the source images, not the CSS, and it
resolves when the catalog gets real photography rather than by changing this
page.

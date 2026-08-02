# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Renters deciding where to live in Quezon City** — the primary user. Someone with a
budget, a place they commute to, and a shortlist they cannot resolve. They are not
short of listings; they are short of a way to choose between them. Assume a
mid-range Android phone on mobile data as the default device and network.

**Landlords with a unit to fill** — a first-class audience, not an afterthought.
They list units and want fewer wasted viewings. Their screens get the same polish
as the renter's.

**Admin (the founder)** — seeds and moderates the catalog. Explicitly *not* a
first-class design audience: admin tooling stays utility-grade and should not
consume design effort that belongs to the other two.

## Product Purpose

An apartment **decision** platform, not a listing site. Competitors answer "what
apartments exist?"; HomeMatch answers "which apartment is best for *me*?"

Every feature must pass one filter: **does this help someone make a better renting
decision?** If not, it is cut.

Two goals are **equally binding**, and neither may be traded off for the other:

1. A portfolio-grade, production-quality full-stack + AI system that survives a
   walkthrough by someone evaluating the engineering.
2. A product real Quezon City renters can genuinely use.

> This supersedes `context/HomeMatch_Context.md` §2, which states the portfolio goal
> is primary and real users are "a bonus." Confirmed with the owner; the context
> doc's other sections still stand.

Success means both audiences are served by the same artifact — a reviewer finds
depth, and a renter finds an answer.

## Positioning

Three mechanisms carry the whole thesis. They must be real and working, because
they are what a neighboring listing site could not truthfully copy:

- **True Monthly Cost** — rent + parking + every other recurring charge, resolved
  to one honest itemized number, always shown with the lines that make it up. The
  sharpest and most demonstrable feature.

  **Move-in cost is not part of it.** Deposit and advance were originally
  amortized over twelve months and folded into the monthly figure, which made a
  ₱5,000 unit report ₱6,450 "per month" — a number the landlord never entered,
  under a label that gave no hint it had been derived. A one-time payment does
  not belong in a monthly number however it is spread. The move-in total is real
  and still shown, as its own figure. Reverting this reintroduces the exact
  confusion it was changed to fix.
- **AI Match Score (hybrid)** — a deterministic rules engine computes 0–100; an LLM
  only writes the plain-language "why," **including the negatives**. Transparency is
  the product, not a nicety.
- **AI Comparison** — two listings in, a readable trade-off summary out, grounded in
  their stored fields.

The swipe / "Tinder for apartments" interaction is one optional input, never the
point. Buttons and keyboard shortcuts are equal first-class ways to express a
preference.

## Operating Context

- **Geography:** Quezon City first, Metro Manila after. Peso (₱) amounts,
  barangay-level addressing, real local anchors — Cubao, UP Diliman,
  Ateneo/Katipunan, Trinoma, Eastwood, BGC.
- **Device:** mid-range Android on mobile data is the default case. Mobile layout
  and page weight lead; desktop is the secondary case. Heavy imagery and large
  JavaScript are real costs to a real user, not abstractions.
- **Language:** English only, `en_PH`. Durable decision — no i18n scaffolding
  required.
- **Supply strategy:** supply-first and manually seeded. The founder hand-curates
  40–50 believable QC listings before public renter access opens.
- **Seed data is a first-class requirement.** Every screen must look alive, never
  empty. A screen that only works with content is a screen that is not finished.

## Capabilities and Constraints

**Tier 1 — built fully, polished, deployed:** auth + RBAC (renter / landlord /
admin), listings + media, search / filter / pagination, favorites, true monthly
cost, AI match score + explanation, AI comparison.

**Tier 2 — real but simpler if time allows:** landlord analytics, AI
natural-language assistant, commute intelligence, neighborhood intelligence.

**Tier 3 — designed and documented, deliberately not built:** predictive
recommendations, market/price-trend insights, in-app messaging, tour scheduling.

Hard constraints on any future work:

- **Tier 3 gets a design doc, never dead UI.** Do not scaffold a control for
  something that is not wired end to end. No dead links: an item is a real route,
  an on-page anchor, or a visibly disabled element.
- **Grounded AI only.** No LLM output ships unless every claim traces to a real
  record field. No hallucinated reasons.
- **Enrichment fields are the product** and belong in the schema as structured
  columns from the first listings migration — cost breakdown, commute anchors,
  barangay, flood risk. Never notes bolted on later.
- **Depth beats breadth.** A half-finished full vision is the failure mode. Six
  polished, tested, deployed features beat fifteen stubbed ones.
- **Deploy every stage.** "Deployable" never drifts more than one stage behind
  "built."

Current state: Stage 0–1. The landing page and the auth flow are built; the
authenticated shell (`/dashboard`, `/browse`, `/landlord`, `/onboarding`) is
placeholder. No Prisma schema and no listings in a database yet.

## Brand Commitments

- **Name:** HomeMatch AI. **Tagline:** "Helping people find the right home, not just
  another listing." Both live in `frontend/src/lib/site.ts` and appear in more than
  one place — change them there, never inline.
- **Contact:** hello@homematch.ph. **Locale:** `en_PH`.
- **Voice:** plain, specific, and unafraid of the downside. The product's whole
  claim is that its numbers can be checked, so copy states real figures and names
  real tradeoffs rather than softening them. "Scores you can argue with are more
  useful than scores you can't see."

## Evidence on Hand

**There is none yet. Everything currently on screen is illustrative.**

- `frontend/src/lib/sample-listing.ts` holds the single demo unit used across the
  landing page and auth screens. It is static demo UI and never calls the API.
- No listings are seeded in a database, nothing is deployed to a public URL, there
  are no users, and no market research has been gathered.

What future work must therefore **never** do: invent user counts, ratings,
testimonials, review scores, press mentions, partner logos, "trusted by" claims, or
any figure implying traction. Social proof must be real or absent. The landing page
already substitutes honest status ("Quezon City first, and only what we can
verify") for proof it does not have — preserve that approach until real evidence
exists.

## Product Principles

1. **Does this help someone decide?** The only filter for whether a feature,
   screen, or element belongs. Listings are not the product; the decision is.
2. **Show the downside at the same size as the upside.** A score that hides its
   tradeoffs is worth less than one you can argue with. Honesty is the mechanism,
   not the tone.
3. **Every number must be traceable.** Deterministic rules own anything scored or
   priced; the LLM only narrates. If a claim cannot be traced to a stored field, it
   does not ship.
4. **Finished beats broad.** Protect Tier 1 at all costs. Demote work into a
   documented design doc rather than shipping it broken.
5. **Both audiences, one artifact.** A reviewer's depth and a renter's usefulness
   come from the same build — never a demo path bolted onto a real product, or a
   real product with a demo veneer.

## Accessibility & Inclusion

The floor is WCAG AA and it is treated as non-negotiable in
`frontend/CLAUDE.md`: visible labels on every input, errors wired via
`aria-invalid` + `aria-describedby` rather than color alone, a visible focus ring
that is never removed without replacement, one `<h1>` per page with headings in
order, landmarks present, decorative icons hidden, and `prefers-reduced-motion`
respected on every animation.

Product-specific: the money is the message, so figures use tabular numerals and
must stay legible and correctly aligned at mobile widths — a misaligned or
truncated peso figure is a correctness bug on this product, not a cosmetic one.

No further accessibility requirement has been established beyond this floor.

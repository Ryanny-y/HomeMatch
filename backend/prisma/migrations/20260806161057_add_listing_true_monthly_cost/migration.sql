-- Adds the denormalized true monthly cost so the catalog can filter on the
-- figure it already displays. Rewritten by hand: Prisma's generated version
-- added a NOT NULL column with no default, which cannot run against a table
-- that already has rows.
--
-- Three steps rather than a DEFAULT. A default would leave every existing
-- listing claiming the wrong cost until something happened to touch it, and a
-- column whose value is a lie until rewritten is worse than one that is absent.

-- 1. Nullable first, so the ALTER succeeds against the existing rows.
ALTER TABLE "listings" ADD COLUMN "trueMonthlyCost" DECIMAL(12,2);

-- 2. Backfill with the same arithmetic as `computeTrueMonthlyCost` in
--    packages/shared. The CASE on "parkingAvailable" is not defensive padding:
--    that function only counts parking when the unit actually offers it, so a
--    row carrying a stale "parkingCost" with the flag off must not be charged
--    for it. Deposit and advance are excluded for the reason recorded on that
--    function - a one-time payment does not belong in a monthly figure.
UPDATE "listings"
SET "trueMonthlyCost" =
      "rent"
    + COALESCE("otherFees", 0)
    + CASE WHEN "parkingAvailable" THEN COALESCE("parkingCost", 0) ELSE 0 END;

-- 3. Every row now holds a real figure, so the constraint can be enforced.
ALTER TABLE "listings" ALTER COLUMN "trueMonthlyCost" SET NOT NULL;

-- CreateIndex
CREATE INDEX "listings_trueMonthlyCost_idx" ON "listings"("trueMonthlyCost");

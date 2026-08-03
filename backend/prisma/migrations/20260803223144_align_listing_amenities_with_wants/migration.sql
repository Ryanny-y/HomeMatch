/*
  Warnings:

  - The values [step_free,quiet_street,laundry] on the enum `RenterWant` are removed.
    Verified empty before this ran: the only stored row held {pets,near_transit}.
    Every remaining value maps 1:1 to a Listing column, which is why these three went —
    a want with nothing to compare against cannot be scored.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RenterWant_new" AS ENUM ('pets', 'parking', 'own_bathroom', 'furnished', 'near_transit', 'aircon');
ALTER TABLE "renter_preferences" ALTER COLUMN "wants" TYPE "RenterWant_new"[] USING ("wants"::text::"RenterWant_new"[]);
ALTER TYPE "RenterWant" RENAME TO "RenterWant_old";
ALTER TYPE "RenterWant_new" RENAME TO "RenterWant";
DROP TYPE "public"."RenterWant_old";
COMMIT;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "aircon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "furnished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nearTransit" BOOLEAN NOT NULL DEFAULT false;


/*
  Warnings:

  - You are about to drop the column `commuteAnchorLabel` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `commuteAnchorLat` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `commuteAnchorLng` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `maxCommuteMinutes` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyCeiling` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `moveInBudget` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `moveInDate` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `moveInFlexible` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `priorities` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `requirements` on the `renter_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `transportMode` on the `renter_preferences` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RenterWant" AS ENUM ('pets', 'parking', 'step_free', 'own_bathroom', 'furnished', 'near_transit', 'quiet_street', 'aircon', 'laundry');

-- AlterTable
ALTER TABLE "renter_preferences" DROP COLUMN "commuteAnchorLabel",
DROP COLUMN "commuteAnchorLat",
DROP COLUMN "commuteAnchorLng",
DROP COLUMN "maxCommuteMinutes",
DROP COLUMN "monthlyCeiling",
DROP COLUMN "moveInBudget",
DROP COLUMN "moveInDate",
DROP COLUMN "moveInFlexible",
DROP COLUMN "notes",
DROP COLUMN "priorities",
DROP COLUMN "requirements",
DROP COLUMN "transportMode",
ADD COLUMN     "budget" DECIMAL(12,2),
ADD COLUMN     "otherNeeds" VARCHAR(500),
ADD COLUMN     "wants" "RenterWant"[];

-- DropEnum
DROP TYPE "RenterPriority";

-- DropEnum
DROP TYPE "RenterRequirement";

-- DropEnum
DROP TYPE "TransportMode";

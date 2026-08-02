-- DropIndex
DROP INDEX "listings_availableFrom_idx";

-- AlterTable
ALTER TABLE "listings" DROP COLUMN "assocDues",
DROP COLUMN "availableFrom",
DROP COLUMN "estInternet",
DROP COLUMN "estUtilities",
DROP COLUMN "floodRiskNote",
DROP COLUMN "floorArea",
DROP COLUMN "furnished",
DROP COLUMN "nearestTransit";

-- DropEnum
DROP TYPE "Furnished";


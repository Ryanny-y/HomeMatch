-- AlterTable
ALTER TABLE "renter_preferences" ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "preferredBarangays" TEXT[],
ADD COLUMN     "preferredCity" TEXT;

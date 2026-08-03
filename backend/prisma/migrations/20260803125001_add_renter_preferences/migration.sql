-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('commute', 'drive', 'walk', 'ride_hail');

-- CreateEnum
CREATE TYPE "RenterRequirement" AS ENUM ('pets', 'parking', 'step_free', 'own_bathroom');

-- CreateEnum
CREATE TYPE "RenterPriority" AS ENUM ('furnished', 'near_transit', 'quiet_street', 'aircon', 'laundry');

-- CreateTable
CREATE TABLE "renter_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "monthlyCeiling" DECIMAL(12,2),
    "moveInBudget" DECIMAL(12,2),
    "commuteAnchorLabel" TEXT,
    "commuteAnchorLat" DOUBLE PRECISION,
    "commuteAnchorLng" DOUBLE PRECISION,
    "transportMode" "TransportMode",
    "maxCommuteMinutes" INTEGER,
    "householdSize" INTEGER,
    "moveInDate" TIMESTAMP(3),
    "moveInFlexible" BOOLEAN NOT NULL DEFAULT false,
    "requirements" "RenterRequirement"[],
    "priorities" "RenterPriority"[],
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renter_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "renter_preferences_userId_key" ON "renter_preferences"("userId");

-- AddForeignKey
ALTER TABLE "renter_preferences" ADD CONSTRAINT "renter_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

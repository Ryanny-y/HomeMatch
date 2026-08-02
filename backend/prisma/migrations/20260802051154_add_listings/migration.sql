-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('condo', 'apartment', 'boarding_house');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('whole_unit', 'bedspace');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "Furnished" AS ENUM ('unfurnished', 'semi_furnished', 'fully_furnished');

-- CreateEnum
CREATE TYPE "BathroomAccess" AS ENUM ('shared', 'private');

-- CreateEnum
CREATE TYPE "GenderPolicy" AS ENUM ('any', 'male_only', 'female_only');

-- CreateEnum
CREATE TYPE "GeocodePrecision" AS ENUM ('rooftop', 'street', 'barangay', 'approximate');

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" "PropertyType" NOT NULL,
    "listingType" "ListingType" NOT NULL DEFAULT 'whole_unit',
    "address" TEXT NOT NULL,
    "barangay" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Quezon City',
    "province" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geocodeProvider" TEXT,
    "externalPlaceId" TEXT,
    "geocodePrecision" "GeocodePrecision",
    "geocodedAt" TIMESTAMP(3),
    "nearestTransit" TEXT,
    "walkabilityNote" TEXT,
    "floodRiskNote" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "bedsPerRoom" INTEGER,
    "bathroomAccess" "BathroomAccess",
    "floorArea" DECIMAL(8,2),
    "furnished" "Furnished" NOT NULL DEFAULT 'unfurnished',
    "floorLevel" INTEGER,
    "totalFloors" INTEGER,
    "rent" DECIMAL(12,2) NOT NULL,
    "depositMonths" INTEGER NOT NULL DEFAULT 1,
    "advanceMonths" INTEGER NOT NULL DEFAULT 1,
    "utilitiesIncluded" BOOLEAN NOT NULL DEFAULT false,
    "estUtilities" DECIMAL(12,2),
    "estInternet" DECIMAL(12,2),
    "assocDues" DECIMAL(12,2),
    "otherFees" DECIMAL(12,2),
    "parkingAvailable" BOOLEAN NOT NULL DEFAULT false,
    "parkingCost" DECIMAL(12,2),
    "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "curfew" TEXT,
    "genderPolicy" "GenderPolicy",
    "availableFrom" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_images" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_commutes" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "anchorKey" TEXT NOT NULL,
    "minutesDrive" INTEGER,
    "minutesTransit" INTEGER,
    "source" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_commutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_ownerId_idx" ON "listings"("ownerId");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_barangay_idx" ON "listings"("barangay");

-- CreateIndex
CREATE INDEX "listings_rent_idx" ON "listings"("rent");

-- CreateIndex
CREATE INDEX "listings_propertyType_idx" ON "listings"("propertyType");

-- CreateIndex
CREATE INDEX "listings_listingType_idx" ON "listings"("listingType");

-- CreateIndex
CREATE INDEX "listings_availableFrom_idx" ON "listings"("availableFrom");

-- CreateIndex
CREATE UNIQUE INDEX "listing_images_storageKey_key" ON "listing_images"("storageKey");

-- CreateIndex
CREATE INDEX "listing_images_listingId_idx" ON "listing_images"("listingId");

-- CreateIndex
CREATE INDEX "listing_commutes_listingId_idx" ON "listing_commutes"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_commutes_listingId_anchorKey_key" ON "listing_commutes"("listingId", "anchorKey");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_commutes" ADD CONSTRAINT "listing_commutes_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

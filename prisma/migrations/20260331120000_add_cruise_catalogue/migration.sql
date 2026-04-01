-- CreateTable: Cruise (reusable catalogue; itineraries reference via TripDayExperience.cruiseId)
CREATE TABLE "Cruise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shipName" TEXT,
    "cruiseLine" TEXT,
    "departingFrom" TEXT,
    "cityId" TEXT,
    "baseCostPerRoom" DOUBLE PRECISION,
    "baseCostPerGuest" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "amenities" TEXT,
    "onboardEntertainmentSummary" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "wishlistId" TEXT,
    "savedByTravelerId" TEXT,

    CONSTRAINT "Cruise_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Cruise_cityId_idx" ON "Cruise"("cityId");
CREATE INDEX "Cruise_createdById_idx" ON "Cruise"("createdById");
CREATE INDEX "Cruise_wishlistId_idx" ON "Cruise"("wishlistId");
CREATE INDEX "Cruise_savedByTravelerId_idx" ON "Cruise"("savedByTravelerId");

ALTER TABLE "Cruise" ADD CONSTRAINT "Cruise_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cruise" ADD CONSTRAINT "Cruise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cruise" ADD CONSTRAINT "Cruise_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cruise" ADD CONSTRAINT "Cruise_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable TripDayExperience: optional link to catalogue Cruise
ALTER TABLE "TripDayExperience" ADD COLUMN "cruiseId" TEXT;

CREATE INDEX "TripDayExperience_cruiseId_idx" ON "TripDayExperience"("cruiseId");

ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_cruiseId_fkey" FOREIGN KEY ("cruiseId") REFERENCES "Cruise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

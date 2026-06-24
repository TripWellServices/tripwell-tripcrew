-- CreateEnum: add 'hike' to ItineraryItemType (PostgreSQL)
ALTER TYPE "ItineraryItemType" ADD VALUE 'hike';

-- CreateTable: Hike (first-class activity; city-scoped like Concert)
CREATE TABLE "Hike" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trailOrPlace" TEXT,
    "cityId" TEXT,
    "difficulty" TEXT,
    "distanceMi" DOUBLE PRECISION,
    "durationMin" INTEGER,
    "url" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hike_pkey" PRIMARY KEY ("id")
);

-- Add FK Hike -> City
CREATE INDEX "Hike_cityId_idx" ON "Hike"("cityId");

ALTER TABLE "Hike" ADD CONSTRAINT "Hike_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable ItineraryItem: add hikeId and FK to Hike
ALTER TABLE "ItineraryItem" ADD COLUMN "hikeId" TEXT;

CREATE INDEX "ItineraryItem_hikeId_idx" ON "ItineraryItem"("hikeId");

ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE SET NULL ON UPDATE CASCADE;

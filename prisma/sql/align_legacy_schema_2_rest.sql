-- Part 2: after part 1 committed — remap TripType, drop legacy, add Trip columns

UPDATE "Trip" SET "tripType" = 'MULTI_DAY'::"TripType" WHERE "tripType"::text = 'VACATION';
UPDATE "Trip" SET "tripType" = 'SINGLE_DAY'::"TripType" WHERE "tripType"::text = 'DAY_TRIP';

ALTER TABLE "Trip" DROP CONSTRAINT IF EXISTS "Trip_planId_fkey";

ALTER TABLE "Trip" DROP COLUMN IF EXISTS "tripName";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "dateRange";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "categories";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "suggestedStops";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "planId";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "tripScope";

ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "travelerId" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "whoWith" "WhoWith";
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "transportMode" "TransportMode";
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "startingLocation" TEXT;

DO $$ BEGIN
  ALTER TABLE "Trip" ADD CONSTRAINT "Trip_travelerId_fkey"
    FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Legacy catalogue links to Plan (removed from Prisma schema)
ALTER TABLE "Hike" DROP CONSTRAINT IF EXISTS "Hike_savedPlanId_fkey";
ALTER TABLE "Hike" DROP COLUMN IF EXISTS "savedPlanId";
ALTER TABLE "Concert" DROP CONSTRAINT IF EXISTS "Concert_savedPlanId_fkey";
ALTER TABLE "Concert" DROP COLUMN IF EXISTS "savedPlanId";
ALTER TABLE "Dining" DROP CONSTRAINT IF EXISTS "Dining_savedPlanId_fkey";
ALTER TABLE "Dining" DROP COLUMN IF EXISTS "savedPlanId";
ALTER TABLE "Attraction" DROP CONSTRAINT IF EXISTS "Attraction_savedPlanId_fkey";
ALTER TABLE "Attraction" DROP COLUMN IF EXISTS "savedPlanId";

DROP TABLE IF EXISTS "ItineraryItem";
DROP TABLE IF EXISTS "Plan";

DROP TYPE IF EXISTS "TripStatus";
DROP TYPE IF EXISTS "TripCategory";
DROP TYPE IF EXISTS "ItineraryItemStatus";
DROP TYPE IF EXISTS "ItineraryItemType";
DROP TYPE IF EXISTS "PlanType";

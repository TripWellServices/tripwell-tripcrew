-- Remove legacy parallel scheduling: TripDayExperience is the only schedule wrapper.
ALTER TABLE "Dining" DROP COLUMN IF EXISTS "itineraryDay";
ALTER TABLE "Attraction" DROP COLUMN IF EXISTS "itineraryDay";

-- Traveler default day window (seeded onto TripDay); was in schema without a prior migration.
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "defaultDayStartTime" TEXT;
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "defaultDayEndTime" TEXT;

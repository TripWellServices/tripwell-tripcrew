-- Add structured flight duration and traveler airport preference.
ALTER TABLE "TripFlight" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;

ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "preferredAirportCode" TEXT;

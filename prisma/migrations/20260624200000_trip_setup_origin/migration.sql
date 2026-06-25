-- CreateEnum
CREATE TYPE "TripSetupOrigin" AS ENUM ('CONCERT_INGEST', 'GENERIC');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "setupOrigin" "TripSetupOrigin" NOT NULL DEFAULT 'GENERIC';

-- Backfill concert-anchored trips
UPDATE "Trip" t
SET "setupOrigin" = 'CONCERT_INGEST'
WHERE EXISTS (
  SELECT 1 FROM "TripConcertAnchor" a WHERE a."tripId" = t."id"
);

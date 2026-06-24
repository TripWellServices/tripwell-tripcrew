-- Lodging as first-class catalogue: chain, type, amenities, price, structured address, check times
CREATE TYPE "LodgingType" AS ENUM (
  'HOTEL',
  'RESORT',
  'EXTENDED_STAY',
  'VACATION_RENTAL',
  'HOSTEL',
  'BED_AND_BREAKFAST',
  'OTHER'
);

ALTER TABLE "Lodging" ADD COLUMN "chain" TEXT,
ADD COLUMN "lodgingType" "LodgingType",
ADD COLUMN "amenities" JSONB,
ADD COLUMN "nightlyRate" DECIMAL(10,2),
ADD COLUMN "currency" TEXT,
ADD COLUMN "streetAddress" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "countryCode" TEXT,
ADD COLUMN "defaultCheckInTime" TEXT,
ADD COLUMN "defaultCheckOutTime" TEXT;

CREATE INDEX "Lodging_city_state_idx" ON "Lodging"("city", "state");

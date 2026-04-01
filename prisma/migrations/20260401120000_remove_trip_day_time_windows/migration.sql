-- Drop optional "day window" strings; day membership is TripDay.date + experiences; UI can add time UX later.
ALTER TABLE "Traveler" DROP COLUMN IF EXISTS "defaultDayStartTime";
ALTER TABLE "Traveler" DROP COLUMN IF EXISTS "defaultDayEndTime";
ALTER TABLE "TripDay" DROP COLUMN IF EXISTS "dayStartTime";
ALTER TABLE "TripDay" DROP COLUMN IF EXISTS "dayEndTime";

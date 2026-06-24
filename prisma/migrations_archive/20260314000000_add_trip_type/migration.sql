-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('DAY_TRIP', 'VACATION');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "tripType" "TripType" NOT NULL DEFAULT 'VACATION';
